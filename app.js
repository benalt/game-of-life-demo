'use strict';

const fs = require('fs');
const assert = require('assert');


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
  const theNextGeneration = getNextGeneration(testItem.given);
  console.log(`testing ${testItem.name}`)
  if (testItem.expected) {
    assert (JSON.stringify(theNextGeneration) === JSON.stringify(testItem.expected));
    //assert (JSON.stringify(theNextGeneration) !== JSON.stringify(testItem.expected)), 'intentionally throws an error';
  }
  if (testItem.testCell) {
    assert (theNextGeneration[testItem.testCell[1]][testItem.testCell[0]] === testItem.testCell[2]);
  }
});


console.log('The Diagnostics tests have passed, performing a request for real data...');
