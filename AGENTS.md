# Agent Guidelines for 2048-React

## Build Commands
- **Build once**: `pnpm gulp build` or `gulp build`
- **Dev mode (watch files)**: `pnpm gulp` or `gulp`
- **No linting or testing commands** configured

## Code Style Guidelines

### JavaScript/React
- **Language**: ES5 JavaScript with React (no TypeScript)
- **Variable declarations**: Use `var` (legacy codebase style)
- **Naming conventions**:
  - Variables/functions: camelCase (`formatBytes`, `handleKeyDown`)
  - React components: PascalCase (`BoardView`, `TileView`)
  - Constants: UPPER_SNAKE_CASE (`stateKey`, `Board.size`)
- **React patterns**:
  - Use class components (not functional components)
  - Bind event handlers in constructor: `this.handleKeyDown = this.handleKeyDown.bind(this)`
  - Use `setState` with function form for state updates based on previous state
  - Lifecycle methods: `componentDidMount`, `componentWillUnmount`
- **Functions**:
  - Use function declarations for component methods
  - Arrow functions for inline callbacks
  - JSDoc comments for complex functions with parameters and return types
- **Error handling**: Use try/catch blocks with `console.error` for logging
- **Async patterns**: Promises with `.then()` (no async/await)

### CSS/SASS
- **Preprocessor**: SASS (.scss files)
- **Class naming**:
  - Component classes: kebab-case (`tile`, `cell`, `board`)
  - Dynamic classes: camelCase with underscores (`position_1_2`, `row_from_0_to_1`)
- **Structure**: Mixins and loops for generating animation classes

### File Organization
- Source files in `src/` directory
- Built files output to `built/` directory
- Static assets in `static/` directory

### Development Workflow
1. Edit files in `src/` directory
2. Run `gulp` to watch and rebuild automatically
3. Serve the root directory with a static server (e.g., `static -p 8000`)
4. Access at `localhost:8000`

### Key Dependencies
- React 15/18 (mixed versions in static/)
- Babel for JSX transpilation
- Gulp for build automation
- SASS for CSS preprocessing</content>
<parameter name="filePath">/home/user/www/node/w2048-react/AGENTS.md