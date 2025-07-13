class BoardView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      board: new Board,
      undoStack: [],
      redoStack: [],
      hint: '',
      auto: false,
      autoDelay: 200
    };
    this.autoTimeout = null;
    // --- SmartAI Web Worker integration ---
    this.smartAIWorker = new window.Worker('src/smart-ai.js');
    this.workerPending = null;
    this.smartAIWorker.onmessage = (e) => {
      if (this.workerPending) {
        this.workerPending(e.data.move);
        this.workerPending = null;
      }
    };
    this.smartAIWorker.onerror = (e) => {
      console.error('SmartAI Worker error:', e);
      if (this.workerPending) {
        this.workerPending(null);
        this.workerPending = null;
      }
    };
    // Bind handleDelayChange for React 15 compatibility
    this.handleDelayChange = this.handleDelayChange.bind(this);
  }
  restartGame() {
    if (this.autoTimeout) clearTimeout(this.autoTimeout);
    this.setState({
      board: new Board,
      undoStack: [],
      redoStack: [],
      hint: '',
      auto: false
    });
  }
  saveState(board) {
    // Deep clone board by serializing and deserializing
    return JSON.parse(JSON.stringify(board, (key, value) => {
      // Remove functions from serialization
      return typeof value === 'function' ? undefined : value;
    }));
  }
  restoreState(stateObj) {
    // Restore a board from a plain object
    let board = new Board();
    // Copy cells and tiles
    for (let r = 0; r < Board.size; ++r) {
      for (let c = 0; c < Board.size; ++c) {
        board.cells[r][c].value = stateObj.cells[r][c].value;
      }
    }
    board.won = stateObj.won;
    board.setPositions();
    return board;
  }
  handleKeyDown(event) {
    if (this.state.board.hasWon()) {
      return;
    }
    if (event.keyCode >= 37 && event.keyCode <= 40) {
      event.preventDefault();
      var direction = event.keyCode - 37;
      const prevState = this.saveState(this.state.board);
      const newBoard = this.state.board.move(direction);
      this.setState(state => ({
        board: newBoard,
        undoStack: [...state.undoStack, prevState],
        redoStack: [],
        hint: '',
        auto: false
      }));
    } else if (event.key === 'u' || event.key === 'U') {
      this.handleUndo();
    } else if (event.key === 'r' || event.key === 'R') {
      this.handleRedo();
    } else if (event.key === 'h' || event.key === 'H') {
      this.handleHint();
    } else if (event.key === 'a' || event.key === 'A') {
      this.toggleAuto();
    }
  }
  handleUndo() {
    if (this.state.undoStack.length === 0) return;
    const prevState = this.state.undoStack[this.state.undoStack.length - 1];
    const redoState = this.saveState(this.state.board);
    this.setState(state => ({
      board: this.restoreState(prevState),
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, redoState]
    }));
  }
  handleRedo() {
    if (this.state.redoStack.length === 0) return;
    const nextState = this.state.redoStack[this.state.redoStack.length - 1];
    const undoState = this.saveState(this.state.board);
    this.setState(state => ({
      board: this.restoreState(nextState),
      undoStack: [...state.undoStack, undoState],
      redoStack: state.redoStack.slice(0, -1)
    }));
  }
  handleTouchStart(event) {
    if (this.state.board.hasWon()) {
      return;
    }
    if (event.touches.length != 1) {
      return;
    }
    this.startX = event.touches[0].screenX;
    this.startY = event.touches[0].screenY;
    event.preventDefault();
  }
  handleTouchEnd(event) {
    if (this.state.board.hasWon()) {
      return;
    }
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
      const prevState = this.saveState(this.state.board);
      const newBoard = this.state.board.move(direction);
      this.setState(state => ({
        board: newBoard,
        undoStack: [...state.undoStack, prevState],
        redoStack: [],
        hint: '',
        auto: false
      }));
    }
  }
  toggleAuto() {
    if (this.state.auto) {
      this.setState({auto: false});
      if (this.autoTimeout) clearTimeout(this.autoTimeout);
    } else {
      this.setState({auto: true}, () => this.autoStep());
    }
  }
  getHintDirection() {
    // Use SmartAI Web Worker for hint direction
    return new Promise((resolve) => {
      this.workerPending = resolve;
      const boardValues = this.state.board.cells.map(row => row.map(cell => cell.value));
      this.smartAIWorker.postMessage({ board: boardValues, size: Board.size });
    });
  }
  async handleHint() {
    const dir = await this.getHintDirection();
    let dirText = '';
    switch (dir) {
      case 0: dirText = 'Left'; break;
      case 1: dirText = 'Up'; break;
      case 2: dirText = 'Right'; break;
      case 3: dirText = 'Down'; break;
      default: dirText = 'No moves available';
    }
    this.setState({hint: dirText});
  }
  async autoStep() {
    if (!this.state.auto || this.state.board.hasWon() || this.state.board.hasLost()) {
      this.setState({auto: false});
      return;
    }
    const dir = await this.getHintDirection();
    if (dir === null) {
      this.setState({auto: false});
      return;
    }
    const prevState = this.saveState(this.state.board);
    const newBoard = this.state.board.move(dir);
    this.setState(state => ({
      board: newBoard,
      undoStack: [...state.undoStack, prevState],
      redoStack: [],
      hint: '',
    }), () => {
      this.autoTimeout = setTimeout(() => this.state.auto && this.autoStep(), this.state.autoDelay);
    });
  }
  handleDelayChange(e) {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    this.setState({autoDelay: val});
  }
  componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    // Terminate worker
    if (this.smartAIWorker) this.smartAIWorker.terminate();
  }
  render() {
    var cells = this.state.board.cells.map((row, rowIndex) => {
      return (
        <div key={rowIndex}>
          { row.map((_, columnIndex) => <Cell key={rowIndex * Board.size + columnIndex} />) }
        </div>
      );
    });
    var tiles = this.state.board.tiles
      .filter(tile => tile.value != 0)
      .map(tile => <TileView tile={tile} key={tile.id} />);
    return (
      <div>
        <div className='board' onTouchStart={this.handleTouchStart.bind(this)} onTouchEnd={this.handleTouchEnd.bind(this)} tabIndex="1">
          {cells}
          {tiles}
          <GameEndOverlay board={this.state.board} onRestart={this.restartGame.bind(this)} />
        </div>
        <div style={{marginTop: '10px', textAlign: 'center'}}>
          <button onClick={this.handleUndo.bind(this)} disabled={this.state.undoStack.length === 0}>Undo (U)</button>
          <button onClick={this.handleRedo.bind(this)} disabled={this.state.redoStack.length === 0} style={{marginLeft: '10px'}}>Redo (R)</button>
          <button onClick={this.handleHint.bind(this)} style={{marginLeft: '10px'}}>Hint (h)</button>
          <button onClick={this.toggleAuto.bind(this)} style={{marginLeft: '10px'}}>{this.state.auto ? 'Stop Auto (a)' : 'Auto (a)'}</button>
          <span style={{marginLeft: '10px'}}>Delay (ms): <input type="number" min="1" value={this.state.autoDelay} onChange={this.handleDelayChange.bind(this)} style={{width: '60px'}} /></span>
          {this.state.hint && <div style={{marginTop: '10px', fontWeight: 'bold'}}>Hint: {this.state.hint}</div>}
        </div>
      </div>
    );
  }
};

class Cell extends React.Component {
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <span className='cell'>{''}</span>
    );
  }
};

class TileView extends React.Component {
  shouldComponentUpdate(nextProps) {
    if (this.props.tile != nextProps.tile) {
      return true;
    }
    if (!nextProps.tile.hasMoved() && !nextProps.tile.isNew()) {
      return false;
    }
    return true;
  }
  render() {
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
    return (
      <span className={classes}>{tile.value}</span>
    );
  }
}

var GameEndOverlay = ({board, onRestart}) => {
  var contents = '';
  if (board.hasWon()) {
    contents = 'Good Job!';
  } else if (board.hasLost()) {
    contents = 'Game Over';
  }
  if (!contents) {
    return null;
  }
  return (
    <div className='overlay'>
      <p className='message'>{contents}</p>
      <button className="tryAgain" onClick={onRestart} onTouchEnd={onRestart}>Try again</button>
    </div>
  );
};

ReactDOM.render(<BoardView />, document.getElementById('boardDiv'));
