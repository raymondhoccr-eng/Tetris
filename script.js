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
let lastDisplayedScore = -1; // To track the last displayed score
let gameOver = false;
let currentPiece;
let currentX;
let currentY;
let dropSpeed = 1000; // Milliseconds per drop step
let lastDropTime = 0;
let animationFrameId = null;

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

function clearPiece(x, y, shape) {
    shape.forEach((row, rY) => {
        row.forEach((value, cX) => {
            if (value !== 0) {
                drawBlock(x + cX, y + rY, 0); // Draw EMPTY_COLOR (index 0)
            }
        });
    });
}

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
    if (gameOver) return false;
    const newX = currentPiece.x + dx;
    const newY = currentPiece.y + dy;
    if (isValidMove(newX, newY, currentPiece.shape)) {
        clearPiece(currentPiece.x, currentPiece.y, currentPiece.shape);
        currentPiece.x = newX;
        currentPiece.y = newY;
        drawPiece();
        return true; // Move was successful
    }
    return false; // Move failed
}

function rotatePiece() {
    if (gameOver) return;
    const originalShape = currentPiece.shape.map(row => [...row]); // Deep copy for clearing
    const originalX = currentPiece.x;
    const originalY = currentPiece.y;

    // Basic rotation (clockwise) - transpose and reverse rows
    const shape = currentPiece.shape; // This is what will be modified
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

    // Check if rotation is valid
    let rotated = false;
    if (isValidMove(currentPiece.x, currentPiece.y, newShape)) {
        clearPiece(originalX, originalY, originalShape);
        currentPiece.shape = newShape;
        drawPiece();
        rotated = true;
    } else {
       // Try wall kick: move right
       if (isValidMove(currentPiece.x + 1, currentPiece.y, newShape)) {
           clearPiece(originalX, originalY, originalShape);
           currentPiece.x += 1;
           currentPiece.shape = newShape;
           drawPiece();
           rotated = true;
       } else if (isValidMove(currentPiece.x - 1, currentPiece.y, newShape)) { // Try wall kick: move left
           clearPiece(originalX, originalY, originalShape);
           currentPiece.x -= 1;
           currentPiece.shape = newShape;
           drawPiece();
           rotated = true;
       }
       // If still not rotated, currentPiece.shape remains the original.
       // No need to restore explicitly if clear/draw only happens on success.
    }
    // If rotation happened, originalX/Y and originalShape were used for clearing.
    // currentPiece.x/y and currentPiece.shape are now the new state.
}

function hardDrop() {
    if (gameOver) return;
    // movePiece now handles clearing and drawing for each step
    while (movePiece(0, 1)) {
        // Keep moving down until it fails
    }
    // lockPiece will handle final board draw
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

    clearLines(); // This might change the board
    drawBoard();  // Redraw the board with the locked piece and after lines clear
    spawnPiece(); // Spawn the next piece
    if (!gameOver) { // Only draw if spawnPiece didn't end the game
      drawPiece();  // Draw the newly spawned piece
    }
    updateScoreDisplay(); // Update score after potential line clear
}

function clearLines() {
    let linesCleared = 0;
    let writeRow = ROWS - 1; // Points to where the next kept row should be written

    // Iterate from bottom to top (readRow)
    for (let readRow = ROWS - 1; readRow >= 0; readRow--) {
        if (board[readRow].every(cell => cell !== 0)) {
            // This line is full
            linesCleared++;
            // Don't copy this row, just increment linesCleared.
            // writeRow remains, waiting for a non-full row from above,
            // or it will eventually mark the start of empty rows at the top.
        } else {
            // This line is not full, so keep it.
            // If lines have been cleared below it, this will copy it down.
            if (readRow !== writeRow) {
                board[writeRow] = board[readRow];
            }
            writeRow--; // Move writeRow up for the next kept row
        }
    }

    // Fill the top rows that were cleared
    // writeRow is now pointing to the row index above the highest kept row
    // (or -1 if all rows were cleared).
    // So, rows from 0 to writeRow (inclusive) need to be filled with empty lines.
    if (linesCleared > 0) {
        for (let i = 0; i <= writeRow; i++) {
            board[i] = Array(COLS).fill(0);
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

function gameTick(timestamp) {
    if (gameOver) return;

    const deltaTime = timestamp - lastDropTime;

    if (deltaTime >= dropSpeed) {
        clearPiece(currentPiece.x, currentPiece.y, currentPiece.shape); // Clear before moving
        if (!movePiece(0, 1)) { // Try moving down
            // If move down failed, piece couldn't move. Redraw it at current spot before locking.
            drawPiece();
            lockPiece();
            // Check game over again in case spawnPiece failed immediately
            if (gameOver) return;
        }
        // If movePiece was successful, it already called drawPiece().
        // If movePiece failed and lockPiece was called, lockPiece handles board/new piece drawing.
        lastDropTime = timestamp; // Reset lastDropTime after a drop attempt
    }
}

function gameLoop(timestamp) {
    if (gameOver) {
        // cancelAnimationFrame(animationFrameId); // endGame will handle this
        return;
    }

    gameTick(timestamp); // Process game logic (includes piece movement and drawing)

    // No general clear/drawBoard/drawPiece here anymore.
    // Those are handled by specific actions (startGame, lockPiece, movePiece, rotatePiece).

    animationFrameId = requestAnimationFrame(gameLoop); // Request next frame
}

// --- Game State ---

function updateScoreDisplay() {
    if (score !== lastDisplayedScore) {
        scoreElement.textContent = score;
        lastDisplayedScore = score;
    }
}

function startGame() {
    startButton.style.display = 'none'; // Hide start button
    gameOverMessage.style.display = 'none'; // Hide game over message
    gameOver = false;
    score = 0;
    // lastDisplayedScore is not reset to -1 here, because updateScoreDisplay()
    // will be called and correctly update to 0 if it was different.
    // Or, to ensure it always updates on new game:
    lastDisplayedScore = -1; // Force update on new game start
    dropSpeed = 1000;
    updateScoreDisplay(); // This will now set scoreElement.textContent = 0 and lastDisplayedScore = 0
    createBoard();
    drawBoard(); // Draw the initial empty board
    spawnPiece();
    if (!gameOver) { // Only draw if spawnPiece didn't end the game
        drawPiece(); // Draw the first piece
    }
    lastDropTime = 0; // Reset drop timer

    // Stop any previous loop before starting a new one
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(gameLoop); // Start the new game loop

    // Add keyboard listener only when game starts
    document.addEventListener('keydown', handleKeyPress);
    canvas.focus(); // Focus canvas if needed for key events
}

function endGame() {
    gameOver = true;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
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
                // With requestAnimationFrame, the drop is continuous.
                // For soft drop, we can reset lastDropTime to make the next drop happen sooner,
                // or simply let the natural drop speed continue.
                // For now, just moving it down is enough, gameLoop will handle timing.
                lastDropTime = performance.now(); // Make the next drop happen sooner after manual drop
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
    // This is now handled by movePiece and rotatePiece directly.
    // if (!gameOver) {
        // context.clearRect(0, 0, canvas.width, canvas.height);
        // drawBoard();
        // drawPiece();
    // }
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