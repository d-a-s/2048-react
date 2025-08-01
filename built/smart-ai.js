'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// Pure functional implementation of the Smart AI for 2048

/**
 * Determines the next best move given the current grid state
 * @param {Array<Array<number>>} grid - 2D array representing the game grid (0 for empty cells)
 * @param {number} gridSize - Size of the grid (usually 4)
 * @returns {number} Direction (0: up, 1: right, 2: down, 3: left)
 */
function nextMove(grid, gridSize) {
  // Plan ahead a few moves in every direction and analyze the board state
  var originalQuality = gridQuality(grid, gridSize);
  var free = getAvailableCells(grid, gridSize).length;
  var moves = 3;
  if (free < 7) moves = 5;
  if (free < 4) moves = 10;
  var results = planAhead(grid, gridSize, 3, originalQuality);
  // Choose the best result
  var bestResult = chooseBestMove(results, originalQuality);
  console.log({
    free: free, moves: moves, originalQuality: originalQuality,
    dir: bestResult.direction
  });
  return bestResult.direction;
}

/**
 * Plans moves ahead and returns the quality metrics for each possible move
 * @param {Array<Array<number>>} grid - 2D array representing the game grid
 * @param {number} gridSize - Size of the grid
 * @param {number} numMoves - Number of moves to look ahead
 * @param {number} originalQuality - Original quality of the grid
 * @returns {Array} Results for each direction
 */
function planAhead(grid, gridSize, numMoves, originalQuality) {
  var results = new Array(4);

  // Try each move and see what happens
  for (var d = 0; d < 4; d++) {
    // Clone the grid so we don't modify the original
    var testGrid = cloneGrid(grid);
    var moved = moveTiles(testGrid, gridSize, d);

    if (!moved) {
      results[d] = null;
      continue;
    }

    // Set up result object for this direction
    var result = {
      quality: -1, // Quality of the grid
      probability: 1, // Probability that the above quality will happen
      qualityLoss: 0, // Sum of quality decrease × probability
      direction: d
    };

    // Get available cells where a new tile could spawn
    var availableCells = getAvailableCells(testGrid, gridSize);

    for (var i = 0; i < availableCells.length; i++) {
      // Check if cell has an adjacent tile
      var hasAdjacentTile = checkAdjacentTiles(testGrid, gridSize, availableCells[i].x, availableCells[i].y);

      if (!hasAdjacentTile) continue;

      // Clone grid again and add a new tile (2)
      var testGrid2 = cloneGrid(testGrid);
      addTile(testGrid2, availableCells[i].x, availableCells[i].y, 2);

      var tileResult = void 0;
      if (numMoves > 1) {
        // Recursively plan ahead more moves
        var subResults = planAhead(testGrid2, gridSize, numMoves - 1, originalQuality);
        tileResult = chooseBestMove(subResults, originalQuality);
      } else {
        // Evaluate the final grid state
        var tileQuality = gridQuality(testGrid2, gridSize);
        tileResult = {
          quality: tileQuality,
          probability: 1,
          qualityLoss: Math.max(originalQuality - tileQuality, 0)
        };
      }

      // Take the worst quality since we have no control over tile spawn location
      if (result.quality === -1 || tileResult.quality < result.quality) {
        result.quality = tileResult.quality;
        result.probability = tileResult.probability / availableCells.length;
      } else if (tileResult.quality === result.quality) {
        result.probability += tileResult.probability / availableCells.length;
      }

      result.qualityLoss += tileResult.qualityLoss / availableCells.length;
    }

    results[d] = result;
  }

  return results;
}

/**
 * Chooses the best move from the available results
 * @param {Array} results - Results of planning ahead
 * @param {number} originalQuality - Original quality of the grid
 * @returns {Object} The best move result
 */
function chooseBestMove(results, originalQuality) {
  // Choose the move with the least probability of decreasing the grid quality
  // If multiple results have the same probability, choose the one with the best quality
  var bestResult = void 0;

  for (var i = 0; i < results.length; i++) {
    if (results[i] === null) continue;

    if (!bestResult || results[i].qualityLoss < bestResult.qualityLoss || results[i].qualityLoss === bestResult.qualityLoss && results[i].quality > bestResult.quality || results[i].qualityLoss === bestResult.qualityLoss && results[i].quality === bestResult.quality && results[i].probability < bestResult.probability) {
      bestResult = results[i];
    }
  }

  if (!bestResult) {
    bestResult = {
      quality: -1,
      probability: 1,
      qualityLoss: originalQuality,
      direction: 0
    };
  }

  return bestResult;
}

/**
 * Evaluates the quality of a grid state
 * @param {Array<Array<number>>} grid - 2D array representing the game grid
 * @param {number} gridSize - Size of the grid
 * @returns {number} Quality score
 */
function gridQuality(grid, gridSize) {
  /* Look at monotonicity of each row and column and sum up the scores.
   * (monoticity = the amount to which a row/column is constantly increasing or decreasing)
   *
   * How monoticity is scored:
   *   score += current_tile_value
   *   -> If a tile goes against the monoticity direction:
   *      score -= max(current_tile_value, prev_tile_value)
   */
  var monoScore = 0;

  // Build traversal orders for both directions
  var traversals = buildTraversals(gridSize);

  // Score columns
  for (var x = 0; x < gridSize; x++) {
    var prevValue = -1;
    var incScore = 0;
    var decScore = 0;

    for (var y = 0; y < gridSize; y++) {
      var tileValue = grid[y][x] || 0;

      incScore += tileValue;
      if (tileValue <= prevValue || prevValue === -1) {
        decScore += tileValue;
        if (tileValue < prevValue && prevValue !== -1) {
          incScore -= Math.max(tileValue, prevValue);
        }
      } else if (prevValue !== -1 && prevValue < tileValue) {
        decScore -= Math.max(tileValue, prevValue);
      }

      prevValue = tileValue;
    }

    monoScore += Math.max(incScore, decScore);
  }

  // Score rows
  for (var _y = 0; _y < gridSize; _y++) {
    var _prevValue = -1;
    var _incScore = 0;
    var _decScore = 0;

    for (var _x = 0; _x < gridSize; _x++) {
      var _tileValue = grid[_y][_x] || 0;

      _incScore += _tileValue;
      if (_tileValue <= _prevValue || _prevValue === -1) {
        _decScore += _tileValue;
        if (_tileValue < _prevValue && _prevValue !== -1) {
          _incScore -= Math.max(_tileValue, _prevValue);
        }
      } else if (_prevValue !== -1 && _prevValue < _tileValue) {
        _decScore -= Math.max(_tileValue, _prevValue);
      }

      _prevValue = _tileValue;
    }

    monoScore += Math.max(_incScore, _decScore);
  }

  // Calculate empty cell bonus
  var emptyCellWeight = 8;
  var emptyScore = countEmptyCells(grid, gridSize) * emptyCellWeight;

  return monoScore + emptyScore;
}

/**
 * Counts the number of empty cells in the grid
 * @param {Array<Array<number>>} grid - 2D array representing the game grid
 * @param {number} gridSize - Size of the grid
 * @returns {number} Count of empty cells
 */
function countEmptyCells(grid, gridSize) {
  var count = 0;

  for (var y = 0; y < gridSize; y++) {
    for (var x = 0; x < gridSize; x++) {
      if (!grid[y][x]) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Gets available cells in the grid
 * @param {Array<Array<number>>} grid - 2D array representing the game grid
 * @param {number} gridSize - Size of the grid
 * @returns {Array} Array of available cell positions {x, y}
 */
function getAvailableCells(grid, gridSize) {
  var cells = [];

  for (var y = 0; y < gridSize; y++) {
    for (var x = 0; x < gridSize; x++) {
      if (!grid[y][x]) {
        cells.push({ x: x, y: y });
      }
    }
  }

  return cells;
}

/**
 * Checks if a cell has any adjacent tiles
 * @param {Array<Array<number>>} grid - 2D array representing the game grid
 * @param {number} gridSize - Size of the grid
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if the cell has an adjacent tile
 */
function checkAdjacentTiles(grid, gridSize, x, y) {
  var vectors = [{ x: 0, y: -1 }, // Up
  { x: 1, y: 0 }, // Right
  { x: 0, y: 1 }, // Down
  { x: -1, y: 0 // Left
  }];

  for (var d = 0; d < 4; d++) {
    var adjX = x + vectors[d].x;
    var adjY = y + vectors[d].y;

    if (withinBounds(adjX, adjY, gridSize) && grid[adjY][adjX]) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a position is within the bounds of the grid
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} gridSize - Size of the grid
 * @returns {boolean} True if position is within bounds
 */
function withinBounds(x, y, gridSize) {
  return x >= 0 && x < gridSize && y >= 0 && y < gridSize;
}

/**
 * Clones a grid
 * @param {Array<Array<number>>} grid - 2D array representing the game grid
 * @returns {Array<Array<number>>} Cloned grid
 */
function cloneGrid(grid) {
  return grid.map(function (row) {
    return [].concat(_toConsumableArray(row));
  });
}

/**
 * Adds a tile to the grid
 * @param {Array<Array<number>>} grid - 2D array representing the game grid
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} value - Value of the tile
 */
function addTile(grid, x, y, value) {
  grid[y][x] = value;
}

/**
 * Builds traversals for the grid
 * @param {number} gridSize - Size of the grid
 * @returns {Object} Traversal orders
 */
function buildTraversals(gridSize) {
  var traversals = {
    x: Array(gridSize).fill().map(function (_, i) {
      return i;
    }),
    y: Array(gridSize).fill().map(function (_, i) {
      return i;
    })
  };

  return traversals;
}

/**
 * Get vector for a direction
 * @param {number} direction - Direction (0: up, 1: right, 2: down, 3: left)
 * @returns {Object} Vector with x and y components
 */
function getVector(direction) {
  var map = [{ x: 0, y: -1 }, // Up
  { x: 1, y: 0 }, // Right
  { x: 0, y: 1 }, // Down
  { x: -1, y: 0 // Left
  }];

  return map[direction];
}

/**
 * Moves tiles on the grid in the specified direction
 * @param {Array<Array<number>>} grid - 2D array representing the game grid
 * @param {number} gridSize - Size of the grid
 * @param {number} direction - Direction (0: up, 1: right, 2: down, 3: left)
 * @returns {boolean} True if any tiles were moved
 */
function moveTiles(grid, gridSize, direction) {
  // Get the vector for the direction
  var vector = getVector(direction);

  // Build traversals
  var traversals = buildTraversals(gridSize);

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x.reverse();
  if (vector.y === 1) traversals.y.reverse();

  var moved = false;

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      var cell = { x: x, y: y };
      var tileValue = grid[y][x];

      if (tileValue) {
        var positions = findFarthestPosition(grid, gridSize, cell, vector);
        var nextPos = positions.next;
        var farthestPos = positions.farthest;

        // Only one merger per row traversal
        if (withinBounds(nextPos.x, nextPos.y, gridSize) && grid[nextPos.y][nextPos.x] === tileValue) {
          // Merge tiles
          grid[nextPos.y][nextPos.x] = tileValue * 2;
          grid[y][x] = 0;
          moved = true;
        } else if (farthestPos.x !== cell.x || farthestPos.y !== cell.y) {
          // Move tile
          grid[farthestPos.y][farthestPos.x] = tileValue;
          grid[y][x] = 0;
          moved = true;
        }
      }
    });
  });

  return moved;
}

/**
 * Finds the farthest position to move a tile in a given direction
 * @param {Array<Array<number>>} grid - 2D array representing the game grid
 * @param {number} gridSize - Size of the grid
 * @param {Object} cell - Starting cell position {x, y}
 * @param {Object} vector - Direction vector {x, y}
 * @returns {Object} Farthest position and next position
 */
function findFarthestPosition(grid, gridSize, cell, vector) {
  var previous = void 0;
  var currentCell = { x: cell.x, y: cell.y };

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = currentCell;
    currentCell = {
      x: previous.x + vector.x,
      y: previous.y + vector.y
    };
  } while (withinBounds(currentCell.x, currentCell.y, gridSize) && !grid[currentCell.y][currentCell.x]);

  return {
    farthest: previous,
    next: currentCell // Used to check if a merge is required
  };
}

// Export the main function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { nextMove: nextMove };
} else {
  self.onmessage = function (e) {
    var _e$data = e.data,
        board = _e$data.board,
        size = _e$data.size;

    var move2 = nextMove(board, size);

    // 0: up, 1: right, 2: down, 3: left
    // 0 -> left, 1 -> up, 2 -> right, 3 -> down
    // let move = (move2 + 1) % 4;
    var move = move2;
    var aiToAppDir = [1, 2, 3, 0];
    move = aiToAppDir[move];
    // console.log(move2, move);
    self.postMessage({ move: move });
  };
}