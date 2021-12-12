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

  // todo: modify code below to initialize state from indexeddb if unable to connect to server
  try {
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



function sendTransaction(isAdding) {
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

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart(transactions);
  populateTable(transactions);
  populateTotal(transactions);

  // todo: queue transaction for sync to server

  // todo: sync transactions
  
  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  })
  .then(data => {
    if (data.errors) {
      errorEl.textContent = "Missing Information";
    }
    else {
      // clear form
      nameEl.value = "";
      amountEl.value = "";
    }
  })
  .catch(err => {
    // fetch failed, so save in indexed db
    saveRecord(transaction);

    // clear form
    nameEl.value = "";
    amountEl.value = "";
  });
}

function saveRecord(transaction) {
  // todo
}

init();
