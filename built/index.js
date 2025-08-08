'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var delays = [1, 50, 150, 250, 500, 1000];

var BoardView = function (_React$Component) {
  _inherits(BoardView, _React$Component);

  function BoardView(props) {
    _classCallCheck(this, BoardView);

    var _this = _possibleConstructorReturn(this, (BoardView.__proto__ || Object.getPrototypeOf(BoardView)).call(this, props));

    _this.state = {
      board: new Board(),
      undoStack: [],
      redoStack: [],
      hint: '',
      auto: false,
      autoDelay: 150
    };
    _this.autoTimeout = null;
    // --- SmartAI Web Worker integration ---
    _this.smartAIWorker = new window.Worker('src/smart-ai.js');
    _this.workerPending = null;
    _this.smartAIWorker.onmessage = function (e) {
      if (_this.workerPending) {
        _this.workerPending(e.data.move);
        _this.workerPending = null;
      }
    };
    _this.smartAIWorker.onerror = function (e) {
      console.error('SmartAI Worker error:', e);
      if (_this.workerPending) {
        _this.workerPending(null);
        _this.workerPending = null;
      }
    };
    // Bind handleDelayChange for React 15 compatibility
    _this.handleDelayChange = _this.handleDelayChange.bind(_this);
    return _this;
  }

  _createClass(BoardView, [{
    key: 'restartGame',
    value: function restartGame() {
      if (this.autoTimeout) clearTimeout(this.autoTimeout);
      this.setState({
        board: new Board(),
        undoStack: [],
        redoStack: [],
        hint: '',
        auto: false
      });
    }
  }, {
    key: 'saveState',
    value: function saveState(board) {
      // Deep clone board by serializing and deserializing
      return JSON.parse(JSON.stringify(board, function (key, value) {
        // Remove functions from serialization
        return typeof value === 'function' ? undefined : value;
      }));
    }
  }, {
    key: 'restoreState',
    value: function restoreState(stateObj) {
      // Restore a board from a plain object
      var board = new Board();
      // Copy cells and tiles
      for (var r = 0; r < Board.size; ++r) {
        for (var c = 0; c < Board.size; ++c) {
          board.cells[r][c].value = stateObj.cells[r][c].value;
        }
      }
      board.won = stateObj.won;
      board.setPositions();
      return board;
    }
  }, {
    key: 'handleKeyDown',
    value: function handleKeyDown(event) {
      if (event.keyCode >= 37 && event.keyCode <= 40) {
        event.preventDefault();
        var direction = event.keyCode - 37;
        var prevState = this.saveState(this.state.board);

        var _state$board$move = this.state.board.move(direction, 1),
            _state$board$move2 = _slicedToArray(_state$board$move, 2),
            newBoard = _state$board$move2[0],
            change = _state$board$move2[1];

        if (change) {
          this.setState(function (state) {
            return {
              board: newBoard,
              undoStack: [].concat(_toConsumableArray(state.undoStack), [prevState]),
              redoStack: [],
              hint: '',
              auto: false
            };
          });
        }
      } else if (event.key === 'u' || event.key === 'U') {
        this.handleUndo();
      } else if (event.key === 'r' || event.key === 'R') {
        this.handleRedo();
      } else if (event.key === 'h' || event.key === 'H') {
        this.handleHint();
      } else if (event.key === 'a' || event.key === 'A') {
        this.toggleAuto();
      } else if (event.key === 'N') {
        this.restartGame();
      } else if (/\d/.test(event.key) && delays[event.key - 1]) {
        this.setState({ autoDelay: delays[event.key - 1] });
      }
    }
  }, {
    key: 'handleUndo',
    value: function handleUndo() {
      var _this2 = this;

      if (this.state.undoStack.length === 0) return;
      var prevState = this.state.undoStack[this.state.undoStack.length - 1];
      var redoState = this.saveState(this.state.board);
      this.setState(function (state) {
        return {
          board: _this2.restoreState(prevState),
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [].concat(_toConsumableArray(state.redoStack), [redoState])
        };
      });
    }
  }, {
    key: 'handleRedo',
    value: function handleRedo() {
      var _this3 = this;

      if (this.state.redoStack.length === 0) return;
      var nextState = this.state.redoStack[this.state.redoStack.length - 1];
      var undoState = this.saveState(this.state.board);
      this.setState(function (state) {
        return {
          board: _this3.restoreState(nextState),
          undoStack: [].concat(_toConsumableArray(state.undoStack), [undoState]),
          redoStack: state.redoStack.slice(0, -1)
        };
      });
    }
  }, {
    key: 'handleTouchStart',
    value: function handleTouchStart(event) {
      if (event.touches.length != 1) {
        return;
      }
      this.startX = event.touches[0].screenX;
      this.startY = event.touches[0].screenY;
      event.preventDefault();
    }
  }, {
    key: 'handleTouchEnd',
    value: function handleTouchEnd(event) {
      if (event.changedTouches.length != 1) {
        return;
      }
      var deltaX = event.changedTouches[0].screenX - this.startX;
      var deltaY = event.changedTouches[0].screenY - this.startY;
      var direction = -1;
      if (Math.abs(deltaX) > 3 * Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        direction = deltaX > 0 ? 2 : 0;
      } else if (Math.abs(deltaY) > 3 * Math.abs(deltaX) && Math.abs(deltaY) > 30) {
        direction = deltaY > 0 ? 3 : 1;
      }
      if (direction != -1) {
        var prevState = this.saveState(this.state.board);

        var _state$board$move3 = this.state.board.move(direction, 1),
            _state$board$move4 = _slicedToArray(_state$board$move3, 2),
            newBoard = _state$board$move4[0],
            change = _state$board$move4[1];

        if (change) {
          this.setState(function (state) {
            return {
              board: newBoard,
              undoStack: [].concat(_toConsumableArray(state.undoStack), [prevState]),
              redoStack: [],
              hint: '',
              auto: false
            };
          });
        }
      }
    }
  }, {
    key: 'toggleAuto',
    value: function toggleAuto() {
      var _this4 = this;

      if (this.state.auto) {
        this.setState({ auto: false });
        if (this.autoTimeout) clearTimeout(this.autoTimeout);
      } else {
        this.setState({ auto: true }, function () {
          return _this4.autoStep();
        });
      }
    }
  }, {
    key: 'getHintDirection',
    value: function getHintDirection() {
      var _this5 = this;

      // Use SmartAI Web Worker for hint direction
      return new Promise(function (resolve) {
        _this5.workerPending = resolve;
        var boardValues = _this5.state.board.cells.map(function (row) {
          return row.map(function (cell) {
            return cell.value;
          });
        });
        _this5.smartAIWorker.postMessage({ board: boardValues, size: Board.size });
      });
    }
  }, {
    key: 'handleHint',
    value: async function handleHint() {
      var dir = await this.getHintDirection();
      var dirText = '';
      switch (dir) {
        case 0:
          dirText = 'Left';break;
        case 1:
          dirText = 'Up';break;
        case 2:
          dirText = 'Right';break;
        case 3:
          dirText = 'Down';break;
        default:
          dirText = 'No moves available';
      }
      this.setState({ hint: dirText });
    }
  }, {
    key: 'autoStep',
    value: async function autoStep() {
      var _this6 = this;

      if (!this.state.auto || this.state.board.hasLost()) {
        this.setState({ auto: false });
        return;
      }
      var dir = await this.getHintDirection();
      if (dir === null) {
        this.setState({ auto: false });
        return;
      }
      var prevState = this.saveState(this.state.board);
      var newBoard = this.state.board.move(dir);
      this.setState(function (state) {
        return {
          board: newBoard,
          undoStack: [].concat(_toConsumableArray(state.undoStack), [prevState]),
          redoStack: [],
          hint: ''
        };
      }, function () {
        _this6.autoTimeout = setTimeout(function () {
          return _this6.state.auto && _this6.autoStep();
        }, _this6.state.autoDelay);
      });
    }
  }, {
    key: 'handleDelayChange',
    value: function handleDelayChange(e) {
      var val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      this.setState({ autoDelay: val });
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      window.removeEventListener('keydown', this.handleKeyDown.bind(this));
      // Terminate worker
      if (this.smartAIWorker) this.smartAIWorker.terminate();
    }
  }, {
    key: 'render',
    value: function render() {
      var _this7 = this;

      var cells = this.state.board.cells.map(function (row, rowIndex) {
        return React.createElement(
          'div',
          { key: rowIndex },
          row.map(function (_, columnIndex) {
            return React.createElement(Cell, { key: rowIndex * Board.size + columnIndex });
          })
        );
      });
      var tiles = this.state.board.tiles.filter(function (tile) {
        return tile.value != 0;
      }).map(function (tile) {
        return React.createElement(TileView, { tile: tile, key: tile.id });
      });
      return React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { className: 'board', onTouchStart: this.handleTouchStart.bind(this), onTouchEnd: this.handleTouchEnd.bind(this), tabIndex: '1' },
          cells,
          tiles,
          React.createElement(GameEndOverlay, { board: this.state.board, onRestart: this.restartGame.bind(this) })
        ),
        React.createElement(
          'div',
          { style: { marginTop: '10px', textAlign: 'center' } },
          React.createElement(
            'button',
            { onClick: this.handleUndo.bind(this), disabled: this.state.undoStack.length === 0 },
            'Undo (U)'
          ),
          React.createElement(
            'button',
            { onClick: this.handleRedo.bind(this), disabled: this.state.redoStack.length === 0, style: { marginLeft: '10px' } },
            'Redo (R)'
          ),
          React.createElement(
            'button',
            { onClick: this.handleHint.bind(this), style: { marginLeft: '10px' } },
            'Hint (h)'
          ),
          React.createElement(
            'button',
            { onClick: this.toggleAuto.bind(this), style: { marginLeft: '10px' } },
            this.state.auto ? 'Stop Auto (a)' : 'Auto (a)'
          )
        ),
        React.createElement(
          'div',
          { style: { marginTop: '10px', textAlign: 'center' } },
          React.createElement(
            'span',
            { style: { marginLeft: '10px' } },
            'Auto delay: ',
            delays.map(function (val) {
              return React.createElement(
                'label',
                { key: val, style: { marginLeft: '8px' } },
                React.createElement('input', {
                  type: 'radio',
                  name: 'autoDelay',
                  value: val,
                  checked: _this7.state.autoDelay === val,
                  onChange: _this7.handleDelayChange
                }),
                val
              );
            })
          ),
          this.state.hint && React.createElement(
            'div',
            { style: { marginTop: '10px', fontWeight: 'bold' } },
            'Hint: ',
            this.state.hint
          )
        )
      );
    }
  }]);

  return BoardView;
}(React.Component);

;

var Cell = function (_React$Component2) {
  _inherits(Cell, _React$Component2);

  function Cell() {
    _classCallCheck(this, Cell);

    return _possibleConstructorReturn(this, (Cell.__proto__ || Object.getPrototypeOf(Cell)).apply(this, arguments));
  }

  _createClass(Cell, [{
    key: 'shouldComponentUpdate',
    value: function shouldComponentUpdate() {
      return false;
    }
  }, {
    key: 'render',
    value: function render() {
      return React.createElement(
        'span',
        { className: 'cell' },
        ''
      );
    }
  }]);

  return Cell;
}(React.Component);

;

var TileView = function (_React$Component3) {
  _inherits(TileView, _React$Component3);

  function TileView() {
    _classCallCheck(this, TileView);

    return _possibleConstructorReturn(this, (TileView.__proto__ || Object.getPrototypeOf(TileView)).apply(this, arguments));
  }

  _createClass(TileView, [{
    key: 'shouldComponentUpdate',
    value: function shouldComponentUpdate(nextProps) {
      if (this.props.tile != nextProps.tile) {
        return true;
      }
      if (!nextProps.tile.hasMoved() && !nextProps.tile.isNew()) {
        return false;
      }
      return true;
    }
  }, {
    key: 'render',
    value: function render() {
      var tile = this.props.tile;
      var classArray = ['tile'];
      classArray.push('tile' + this.props.tile.value);
      if (!tile.mergedInto) {
        classArray.push('position_' + tile.row + '_' + tile.column);
      }
      if (tile.mergedInto) {
        classArray.push('merged');
      }
      if (tile.isNew()) {
        classArray.push('new');
      }
      if (tile.hasMoved()) {
        classArray.push('row_from_' + tile.fromRow() + '_to_' + tile.toRow());
        classArray.push('column_from_' + tile.fromColumn() + '_to_' + tile.toColumn());
        classArray.push('isMoving');
      }
      var classes = classArray.join(' ');
      return React.createElement(
        'span',
        { className: classes },
        tile.value
      );
    }
  }]);

  return TileView;
}(React.Component);

var GameEndOverlay = function GameEndOverlay(_ref) {
  var board = _ref.board,
      onRestart = _ref.onRestart;

  var contents = '';
  // Only show overlay if lost
  if (board.hasLost()) {
    contents = 'Game Over';
  }
  if (!contents) {
    return null;
  }
  return React.createElement(
    'div',
    { className: 'overlay' },
    React.createElement(
      'p',
      { className: 'message' },
      contents
    ),
    React.createElement(
      'button',
      { className: 'tryAgain', onClick: onRestart, onTouchEnd: onRestart },
      'Try again'
    )
  );
};

ReactDOM.render(React.createElement(BoardView, null), document.getElementById('boardDiv'));