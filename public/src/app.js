import Dexie from 'dexie';
import { populateTotal, populateTable, populateChart } from './populatePage';

const db = new Dexie('BudgetDatabase');
let transactions = [];


db.version(1).stores({
  transactions: '&date, name, value', // Mirror of server database plus any unsynced transactions
  pendingSync: '&date, name, value'  // Unsynced transactions
})

async function init() {
  document.querySelector("#add-btn").onclick = function() {
    sendTransaction(true);
  };
  
  document.querySelector("#sub-btn").onclick = function() {
    sendTransaction(false);
  };

  document.addEventListener('online', syncQueuedTransactions);

  // todo: modify code below to initialize state from indexeddb if unable to connect to server
  try {
    await syncQueuedTransactions();

    const getResponse = await fetch("/api/transaction");
    
    // save db data on global variable
    transactions = await getResponse.json();

    // store data from server locally
    await db.transactions.clear();
    await db.transactions.bulkPut(transactions);

    // todo remove
    console.log('Transactions from remote API: ', transactions);

    populateTotal(transactions);
    populateTable(transactions);
    populateChart(transactions);

  } catch (error) {
    // initialize transactions based on local data
    transactions = await db.transactions.orderBy('date').toArray();
  }
}

async function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add transaction to local and remote stores
  await registerTransaction(transaction);

  // re-run logic to populate ui with new record
  populateChart(transactions);
  populateTable(transactions);
  populateTotal(transactions);
  
  // clear form
  nameEl.value = "";
  amountEl.value = "";

  // also send to server
  syncQueuedTransactions()
  .catch(() => {
    console.log('Transaction data sync failed. Transactions will be kept in local DB.')
  });
}

/**
 * Adds a transaction to the list in memory and storage.
 */
async function registerTransaction(transaction) {
  // add to beginning of current array of data
  transactions.unshift(transaction);
  
  // add to local transactions indexeddb
  await db.transactions.put(transaction)
  
  // queue for syncing with remote db
  return db.pendingSync.put(transaction);
}

/**
 * Syncs all the transactions stored locally but not on the remote server
 */
async function syncQueuedTransactions() {
  const unsyncedTransactions = await db.pendingSync.toArray();
  return Promise.all(unsyncedTransactions.map(transaction => syncTransaction(transaction)));
}

/**
 * Syncs a transaction queued up locally and deletes it from the local queue upon success.
 */
async function syncTransaction(transaction) {
  return fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  }).then(data => {
    if (data.errors) return data;
    return db.pendingSync.where({date: transaction.date}).delete();
  });
}

init();
