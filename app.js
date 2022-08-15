'use strict';

const fs = require('fs');
const assert = require('assert');
const { exec } = require("child_process");

const GOL_SERVICE_GET_ENDPOINT = 'https://game-of-life-service-ai3nmiz7aa-uc.a.run.app/world';
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
    getCellState({x: cellPosition.x, y: cellPosition.y - 1}, organism ),  // top neighbor
    getCellState({x: cellPosition.x, y: cellPosition.y + 1}, organism ),  // bottom neighbor
    getCellState({x: cellPosition.x - 1, y: cellPosition.y}, organism ),  // left neighbor
    getCellState({x: cellPosition.x + 1, y: cellPosition.y}, organism )   // right neighbor
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

console.log('The diagnostics tests have passed, performing a request for real data...');
console.log('Data fetch starting.');
fetch(GOL_SERVICE_GET_ENDPOINT, {
  method: 'GET',
  cache: 'no-cache',
  headers: {
    'Content-Type': 'application/json'
  },
  redirect: 'follow',
  referrerPolicy: 'no-referrer'
})
.then((response) => response.json())
.then((worldData) => {
  console.log('World data GET successful.');
  console.log(`   worldData.generationCount : ${worldData.generationCount}`);
  console.log(`   worldData.world[0].length : ${worldData.world[0].length}`);
  console.log(`   worldData.size            : ${worldData.size}`);

  let newData = {
    generations: [],
    ...worldData
  };

  delete newData.world;
  newData.generations.push(worldData.world.map(x=>x)); // generation 0 is the same as the world that is sent, so we duplicate it
  let i = 1; // start at 1, not 0
  while (i<worldData.generationCount) {
    console.log(`Creating generation ${i}`);
    newData.generations.push(getNextGeneration(newData.generations[i-1]));
    i+=1;
  }

  // do some basic data verification 
  assert(JSON.stringify(newData.generations.length) == worldData.generationCount, `expected ${generationCount} generations to be created`);
  assert(JSON.stringify(newData.generations[0]) == JSON.stringify(worldData.world));
  newData.generations.forEach( (generation) => {
    assert(generation.length === worldData.size, `expected a world with ${worldData.size} rows`);
    assert(generation[0].length === worldData.size, `expected a world with  ${worldData.size} cols`);
  });
  console.log(`data varification complete, things are the right size`);

  console.log(`Starting new data POST...`);
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
    if (response.redirected) {
      console.log(`Opening ${response.url}`);
      exec(`open ${response.url}`);
    } else {
      throw `Expected a redirected response, instead got ${response.status}`;
    }
  })
  .catch((error)=> {
    console.log('Error POSTing world data');
    console.log(error);
  });
}).catch((error)=> {
  console.log('Error GETting world data');
  console.log(error);
});