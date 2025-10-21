const delays = [1, 50, 150, 250, 500, 1000];
const stateKey = 'w2048-game-state';

function formatBytes(bytes) {
  if (typeof bytes === 'object' && bytes.length > 0) bytes = bytes.length;
  if (typeof bytes === 'string' && bytes.length > 0) bytes = bytes.length;
  if (bytes < 1024) return bytes + 'b';
  let kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(2) + 'kb';
  let mb = kb / 1024;
  if (mb < 1024) return mb.toFixed(2) + 'mb';
  let gb = mb / 1024;
  return gb.toFixed(2) + 'gb';
}
class BoardView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      board: new Board,
      undoStack: [],
      redoStack: [],
      hint: '',
      auto: false,
      autoDelay: 150
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
    // Flatten the board's cell values into a 1D array
    return board.cells.flat().map(cell => cell.value);
  }

  restoreState(stateArr) {
    // Restore a board from a 1D array of values
    let board = new Board();
    for (let i = 0; i < Board.size * Board.size; ++i) {
      let r = Math.floor(i / Board.size);
      let c = i % Board.size;
      board.cells[r][c].value = stateArr[i];
    }
    board.setPositions();
    return board;
  }

  handleKeyDown(event) {
    if (event.keyCode >= 37 && event.keyCode <= 40) {
      event.preventDefault();
      var direction = event.keyCode - 37;
      const prevState = this.saveState(this.state.board);
      const [newBoard, change] = this.state.board.move(direction, 1);
      if (change) {
        this.setState(state => ({
          board: newBoard,
          undoStack: [...state.undoStack, prevState],
          redoStack: [],
          hint: '',
          auto: false
        }));
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
    } else if (/^(Y|C)$/.test(event.key)) {
      this.saveToLocalStorage(event.key === 'C');
    } else if (/^P$/.test(event.key)) {
      this.restoreFromLocalStorage();
    } else if (/^\d$/.test(event.key) && delays[event.key - 1]) {
      this.setState({ autoDelay: delays[event.key - 1] });
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
  setStatus(txt, timeout) {
    this.setState(s => Object.assign({}, s, { status: txt }));
    if (timeout && txt) setTimeout(() => {
      this.setState(s => {
        if (s.status !== txt) return s;
        return Object.assign({}, s, { status: undefined });
      });
    }, timeout);
  }
  saveToLocalStorage(clip) {
    try {
      const copy = Object.assign({}, this.state);
      copy.board = this.saveState(copy.board);
      const myState = JSON.stringify(copy);
      this.setStatus(`saving ${formatBytes(myState)}...`);
      idbKeyval.set(stateKey, myState).then(x => {
        if (clip) navigator.clipboard.writeText(myState);
        this.setStatus(`saved ${formatBytes(myState)}!`, 2000);
      });
      // localStorage.setItem(stateKey, myState);
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }
  restoreFromLocalStorage() {
    try {
      this.setStatus('restoring...');
      idbKeyval.get(stateKey).then(stateTxt => {
        const myState = JSON.parse(stateTxt);
        if (typeof myState !== 'object') {
          this.setStatus();
          return;
        };
        myState.board = this.restoreState(myState.board);
        this.setState(x => Object.assign({}, x, myState));
        this.setStatus(`restored! ${formatBytes(stateTxt)}`, 2000);
      });
    } catch (e) {
      console.error('Failed to restore state:', e);
    }
  }

  handleTouchStart(event) {
    if (event.touches.length != 1) {
      return;
    }
    this.startX = event.touches[0].screenX;
    this.startY = event.touches[0].screenY;
    event.preventDefault();
  }
  handleTouchEnd(event) {
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
      const [newBoard, change] = this.state.board.move(direction, 1);
      if (change) {
        this.setState(state => ({
          board: newBoard,
          undoStack: [...state.undoStack, prevState],
          redoStack: [],
          hint: '',
          auto: false
        }));
      }
    }
  }
  toggleAuto() {
    if (this.state.auto) {
      this.setState({ auto: false });
      if (this.autoTimeout) clearTimeout(this.autoTimeout);
    } else {
      this.setState({ auto: true }, () => this.autoStep());
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
    this.setState({ hint: dirText });
  }
  async autoStep() {
    if (!this.state.auto || this.state.board.hasLost()) {
      this.setState({ auto: false });
      return;
    }
    const dir = await this.getHintDirection();
    if (dir === null) {
      this.setState({ auto: false });
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
    this.setState({ autoDelay: val });
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
          {row.map((_, columnIndex) => <Cell key={rowIndex * Board.size + columnIndex} />)}
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
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <button onClick={this.handleUndo.bind(this)} disabled={this.state.undoStack.length === 0}>Undo (U)</button>
          <button onClick={this.handleRedo.bind(this)} disabled={this.state.redoStack.length === 0} style={{ marginLeft: '10px' }}>Redo (R)</button>
          <button onClick={this.handleHint.bind(this)} style={{ marginLeft: '10px' }}>Hint (h)</button>
          <button onClick={this.toggleAuto.bind(this)} style={{ marginLeft: '10px' }}>{this.state.auto ? 'Stop Auto (a)' : 'Auto (a)'}</button>
        </div>
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <span style={{ marginLeft: '10px' }}>Auto delay: {
            delays.map(val => (
              <label key={val} style={{ marginLeft: '8px' }}>
                <input
                  type="radio"
                  name="autoDelay"
                  value={val}
                  checked={this.state.autoDelay === val}
                  onChange={this.handleDelayChange}
                />
                {val}
              </label>
            ))
          }</span>
          {this.state.hint && <div style={{ marginTop: '10px', fontWeight: 'bold' }}>Hint: {this.state.hint}</div>}
        </div>
        <div>
          <div>History: {this.state.undoStack.length}
            {this.state.status && ` (${this.state.status})`}
          </div>
          <div>
            <button onClick={this.saveToLocalStorage.bind(this)}>Save (Y)</button>
            <button onClick={this.restoreFromLocalStorage.bind(this)}>Restore (P)</button>
          </div>
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

var GameEndOverlay = ({ board, onRestart }) => {
  var contents = '';
  // Only show overlay if lost
  if (board.hasLost()) {
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
