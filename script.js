const canvas = document.getElementById('tetrisCanvas');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('startButton');
const gameOverMessage = document.getElementById('gameOverMessage');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = canvas.width / COLS; // Calculate block size based on canvas width and COLS
const EMPTY_COLOR = '#1a1a1a'; // Background color of the canvas

// Adjust canvas height based on calculated BLOCK_SIZE and ROWS
canvas.height = BLOCK_SIZE * ROWS;

const COLORS = [
    null,        // 0 represents empty cell
    '#FF0D72',   // I - Red
    '#0DC2FF',   // J - Blue
    '#0DFF72',   // L - Green
    '#F538FF',   // O - Magenta
    '#FF8E0D',   // S - Orange
    '#FFE138',   // T - Yellow
    '#3877FF'    // Z - Dodger Blue
];

const PIECES = [
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]]  // Z
];

let board = [];
let score = 0;
let gameOver = false;
let currentPiece;
let currentX;
let currentY;
let gameLoopInterval;
let dropSpeed = 1000; // Milliseconds per drop step

// --- Game Board ---

function createBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawBlock(c, r, board[r][c]);
        }
    }
}

// --- Tetrominoes ---

function getRandomPiece() {
    const randomIndex = Math.floor(Math.random() * PIECES.length);
    const piece = PIECES[randomIndex];
    const colorIndex = randomIndex + 1; // +1 because COLORS[0] is null
    return {
        shape: piece.map(row => row.map(cell => (cell !== 0 ? colorIndex : 0))),
        colorIndex: colorIndex,
        x: 0, // Will be set by spawnPiece
        y: 0  // Will be set by spawnPiece
    };
}

function spawnPiece() {
    currentPiece = getRandomPiece();
    // Start position: center horizontally, top vertically
    currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
    currentPiece.y = 0;

    // Game Over check
    if (!isValidMove(currentPiece.x, currentPiece.y, currentPiece.shape)) {
        endGame();
    }
}

// --- Drawing ---

function drawBlock(x, y, colorIndex) {
    context.fillStyle = COLORS[colorIndex] || EMPTY_COLOR;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    if (colorIndex !== 0) { // Add a subtle border to blocks
        context.strokeStyle = 'rgba(0, 0, 0, 0.3)'; // Darker border
        context.lineWidth = 1;
        context.strokeRect(x * BLOCK_SIZE + 0.5, y * BLOCK_SIZE + 0.5, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
    }
}

function drawPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(currentPiece.x + x, currentPiece.y + y, currentPiece.colorIndex);
            }
        });
    });
}

// --- Movement & Collision ---

function isValidMove(newX, newY, pieceShape) {
    for (let y = 0; y < pieceShape.length; y++) {
        for (let x = 0; x < pieceShape[y].length; x++) {
            if (pieceShape[y][x] !== 0) {
                let boardX = newX + x;
                let boardY = newY + y;

                // Check boundaries
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return false;
                }
                // Check collision with existing blocks (only if within bounds)
                if (boardY >= 0 && board[boardY][boardX] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

function movePiece(dx, dy) {
    if (gameOver) return;
    const newX = currentPiece.x + dx;
    const newY = currentPiece.y + dy;
    if (isValidMove(newX, newY, currentPiece.shape)) {
        currentPiece.x = newX;
        currentPiece.y = newY;
        return true; // Move was successful
    }
    return false; // Move failed
}

function rotatePiece() {
    if (gameOver) return;
    // Basic rotation (clockwise) - transpose and reverse rows
    const shape = currentPiece.shape;
    const N = shape.length; // Assume square for simplicity of first transpose step
    const M = shape[0].length;
    const newShape = Array.from({ length: M }, () => Array(N).fill(0));

    for (let y = 0; y < N; y++) {
        for (let x = 0; x < M; x++) {
            if (shape[y][x] !== 0) {
                newShape[x][N - 1 - y] = currentPiece.colorIndex;
            }
        }
    }

    // Check if rotation is valid (potentially needs wall kick logic for finesse)
    if (isValidMove(currentPiece.x, currentPiece.y, newShape)) {
        currentPiece.shape = newShape;
    } else {
       // Optional: Add basic wall kick logic here if needed
       // Try moving left/right slightly if rotation failed
       if (isValidMove(currentPiece.x + 1, currentPiece.y, newShape)) {
           currentPiece.x += 1;
           currentPiece.shape = newShape;
       } else if (isValidMove(currentPiece.x - 1, currentPiece.y, newShape)) {
           currentPiece.x -= 1;
           currentPiece.shape = newShape;
       }
    }
}

function hardDrop() {
    if (gameOver) return;
    while (movePiece(0, 1)) {
        // Keep moving down until it fails
    }
    // Lock immediately after hard drop
    lockPiece();
}


// --- Locking & Line Clearing ---

function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Ensure piece doesn't lock above the top boundary
                if (currentPiece.y + y >= 0) {
                    board[currentPiece.y + y][currentPiece.x + x] = currentPiece.colorIndex;
                }
            }
        });
    });

    clearLines();
    spawnPiece(); // Spawn the next piece
    updateScoreDisplay(); // Update score after potential line clear
}

function clearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; ) { // Iterate bottom-up
        if (board[r].every(cell => cell !== 0)) {
            // Line is full
            linesCleared++;
            // Remove the row
            board.splice(r, 1);
            // Add a new empty row at the top
            board.unshift(Array(COLS).fill(0));
            // Don't decrement 'r' here, check the new row at the same index
        } else {
            r--; // Move to the next row up
        }
    }

    // Update score based on lines cleared
    if (linesCleared > 0) {
        let points = linesCleared * 100; // Basic scoring
        if (linesCleared === 4) points *= 2; // Tetris bonus!
        score += points;
        // Optional: Increase speed based on lines cleared or score
        // dropSpeed = Math.max(200, 1000 - Math.floor(score / 500) * 50);
    }
}

// --- Game Loop ---

function gameLoop() {
    if (gameOver) return;

    // Try moving down
    if (!movePiece(0, 1)) {
        // If move down failed, lock the piece
        lockPiece();
         // Check game over again in case spawnPiece failed immediately
        if (gameOver) return;
    }

    // Clear canvas and redraw everything
    context.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas
    drawBoard();
    drawPiece();

     // Reset interval if speed changed
    clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(gameLoop, dropSpeed);
}

// --- Game State ---

function updateScoreDisplay() {
    scoreElement.textContent = score;
}

function startGame() {
    startButton.style.display = 'none'; // Hide start button
    gameOverMessage.style.display = 'none'; // Hide game over message
    gameOver = false;
    score = 0;
    dropSpeed = 1000;
    updateScoreDisplay();
    createBoard();
    spawnPiece();
    // Clear any previous interval
    if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
    }
    gameLoopInterval = setInterval(gameLoop, dropSpeed);
    // Add keyboard listener only when game starts
    document.addEventListener('keydown', handleKeyPress);
    canvas.focus(); // Focus canvas if needed for key events
}

function endGame() {
    gameOver = true;
    clearInterval(gameLoopInterval);
    document.removeEventListener('keydown', handleKeyPress); // Remove listener
    finalScoreElement.textContent = score;
    gameOverMessage.style.display = 'block'; // Show game over message
}

// --- Input Handling ---

function handleKeyPress(event) {
    if (gameOver) return;

    switch (event.key) {
        case 'ArrowLeft':
        case 'a': // Optional WASD
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
        case 'd': // Optional WASD
            movePiece(1, 0);
            break;
        case 'ArrowDown':
        case 's': // Optional WASD
            // Move down faster or trigger game loop step immediately
            if (!movePiece(0, 1)) {
                lockPiece(); // Lock if it can't move down
            } else {
                // Reset timer to make soft drop feel responsive
                clearInterval(gameLoopInterval);
                 gameLoopInterval = setInterval(gameLoop, dropSpeed);
            }
            break;
        case 'ArrowUp':
        case 'w': // Optional WASD
            rotatePiece();
            break;
        case ' ': // Spacebar for Hard Drop
             event.preventDefault(); // Prevent page scrolling
             hardDrop();
             break;
    }

    // Redraw immediately after input for responsiveness
    if (!gameOver) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawBoard();
        drawPiece();
    }
}

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Initial setup message (optional)
context.fillStyle = '#555';
context.fillRect(0, 0, canvas.width, canvas.height);
context.font = '16px Arial';
context.fillStyle = 'white';
context.textAlign = 'center';
context.fillText('Press Start Game to Play!', canvas.width / 2, canvas.height / 2);