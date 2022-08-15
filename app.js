'use strict';

const fs = require('fs');
const assert = require('assert');
const { exec } = require("child_process");

const GOL_SERVICE_GET_ENDPOINT = 'https://game-of-life-service-ai3nmiz7aa-uc.a.run.app/world/3SB7qtMD';
const GOL_SERVICE_POST_ENDPOINT = 'https://game-of-life-service-ai3nmiz7aa-uc.a.run.app/results'

function getCellState(cellPosition, organism) {
  // state: 0 - dead
  //        1 - alive
  //       -1 - never existed 
  if (cellPosition.x < 0 || cellPosition.x >= organism[0].length || cellPosition.y < 0 || cellPosition.y >= organism.length) {
    return -1;
  }
  return organism[cellPosition.y][cellPosition.x]
}

function getCellFate(cellPosition, organism) {
  let liveNeighborCount = [
    // Assumes a 4 neighbor (N, S, E, W) relationship
    getCellState({x: cellPosition.x, y: cellPosition.y - 1}, organism ),// top neighbor
    getCellState({x: cellPosition.x, y: cellPosition.y + 1}, organism ),// bottom neighbor
    getCellState({x: cellPosition.x - 1, y: cellPosition.y}, organism ),// left neighbor
    getCellState({x: cellPosition.x + 1, y: cellPosition.y}, organism )// right neighbor
  ].filter(testCellStat => testCellStat > 0).length;
  // Any dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.
  if (getCellState(cellPosition, organism) === 0 ) {
    return (liveNeighborCount === 3) ? 1 : 0;
  }
  // We're only looking at live cells now
  return [
    //Any live cell with fewer than two live neighbors dies, as if by underpopulation.
    0, 0, 
    //Any live cell with two or three live neighbors lives on to the next generation.
    1, 1,
    //Any live cell with more than three live neighbors dies, as if by overpopulation.
    0
  ][liveNeighborCount];
}

function getNextGeneration(organism) {
  let nextGeneration = [];
  // loop throught MD array
  for (let y = 0; y<organism.length; y++) {
    nextGeneration[y] = [];
    for (let x = 0; x<organism[y].length; x++) {
      // build the cell's state in the next generation
      nextGeneration[y][x] = getCellFate({x:x, y:y}, organism);
    }
  }
  return nextGeneration;
}

let rawTestData = fs.readFileSync('./test-data.json');
let testData = JSON.parse(rawTestData);

// run diagnostic test to verify that the basics of getNextGeneration work
testData.forEach(testItem => {
  let theNextGeneration = getNextGeneration(testItem.given);
  console.log(`testing ${testItem.name}`)
  if (testItem.generations) {
    testItem.generations.forEach((expected)=> {
      assert (JSON.stringify(theNextGeneration) === JSON.stringify(expected));
      theNextGeneration = getNextGeneration(theNextGeneration);
    })
  }
});

console.log('The Diagnostics tests have passed, performing a request for real data...');
fetch(GOL_SERVICE_GET_ENDPOINT)
.then((response) => response.json())
.then((worldData) => {
  console.log('World data GET successful.');
  let newData = {
    generations: [],
    ...worldData
  }
  delete newData.world;
  newData.generations.push(worldData.world.map(x=>x));
  let i=1;
  while (i<worldData.generationCount) {
    console.log(`Creating generation ${i}`);
    newData.generations.push(getNextGeneration(newData.generations[i-1]));
    i+=1;
  }

  console.log(`${newData.generations.length} generations created`);

  fetch(GOL_SERVICE_POST_ENDPOINT, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json'
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer', 
    body: JSON.stringify(newData) 
  })
  .then(response => {
    console.log('Generations data POST successful');
    console.log(response.status === 302, response.url );
    if (response.status === 302 || response.redirected) {
      console.log(`Opening ${response.url}`);
      exec(`open ${response.url}`);
    } else {
      throw `Expected a redirect got ${response.status}`;
    }
    console.log(response);

  })
  .catch((error)=> {
    console.log('Error POSTing world data');
    console.log(error);
  });
}).catch((error)=> {
  console.log('Error GETting world data');
  console.log(error);
});