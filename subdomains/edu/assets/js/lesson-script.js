// Lesson Interactive JavaScript

// Global function for color generation (used across exercises)
function generateRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const hex = '#' + 
        r.toString(16).padStart(2, '0') +
        g.toString(16).padStart(2, '0') +
        b.toString(16).padStart(2, '0');
    return hex.toUpperCase();
}

// Progress tracking
let completedExercises = 0;
const totalExercises = 5;

function updateProgress() {
    completedExercises++;
    const percentage = (completedExercises / totalExercises) * 100;
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `Progress: ${completedExercises} of ${totalExercises} exercises complete`;
    
    if (completedExercises === totalExercises) {
        setTimeout(showCelebration, 500);
    }
}

function showCelebration() {
    document.getElementById('celebration').classList.add('show');
    document.getElementById('overlay').classList.add('show');
}

function closeCelebration() {
    document.getElementById('celebration').classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
}

// Exercise 1
function runCode1() {
    const code = document.getElementById('code1').value;
    const output = document.getElementById('output1');
    try {
        let consoleOutput = '';
        const originalLog = console.log;
        console.log = function(...args) {
            consoleOutput += args.join(' ') + '\n';
            originalLog.apply(console, args);
        };
        
        eval(code);
        console.log = originalLog;
        
        output.textContent = consoleOutput || 'Code executed successfully!';
        output.className = 'output-area output-success';
    } catch (error) {
        output.textContent = 'Error: ' + error.message;
        output.className = 'output-area output-error';
    }
}

function checkExercise1() {
    const code = document.getElementById('code1').value.toLowerCase();
    if (code.includes('math.random()') && code.includes('math.floor') && code.includes('256')) {
        document.getElementById('status1').textContent = '✓ Complete';
        document.getElementById('status1').className = 'exercise-status status-complete';
        document.getElementById('output1').textContent = '✓ Correct! You\'ve learned how to generate random numbers!';
        document.getElementById('output1').className = 'output-area output-success';
        unlockExercise2();
        updateProgress();
    } else {
        document.getElementById('output1').textContent = '✗ Not quite. Make sure you\'re using Math.floor(Math.random() * 256)';
        document.getElementById('output1').className = 'output-area output-error';
    }
}

function unlockExercise2() {
    document.getElementById('code2').disabled = false;
    document.getElementById('code2').placeholder = 'Now type your code here!';
    document.getElementById('run2').disabled = false;
    document.getElementById('check2').disabled = false;
    document.getElementById('hint2btn').disabled = false;
    document.getElementById('status2').textContent = 'Ready';
    document.getElementById('output2').textContent = 'Fill in the missing code and click Run!';
}

// Exercise 2
function runCode2() {
    const code = document.getElementById('code2').value;
    const output = document.getElementById('output2');
    try {
        let consoleOutput = '';
        const originalLog = console.log;
        console.log = function(...args) {
            consoleOutput += args.join(' ') + '\n';
            originalLog.apply(console, args);
        };
        
        eval(code);
        console.log = originalLog;
        
        output.textContent = consoleOutput || 'Code executed!';
        output.className = 'output-area output-success';
    } catch (error) {
        output.textContent = 'Error: ' + error.message;
        output.className = 'output-area output-error';
    }
}

function checkExercise2() {
    const code = document.getElementById('code2').value;
    if (code.includes('Math.floor(Math.random() * 256)') && 
        code.match(/const g =/i) && 
        code.match(/const b =/i)) {
        document.getElementById('status2').textContent = '✓ Complete';
        document.getElementById('status2').className = 'exercise-status status-complete';
        document.getElementById('output2').textContent = '✓ Amazing! You created a function that generates random colors!';
        document.getElementById('output2').className = 'output-area output-success';
        unlockExercise3();
        updateProgress();
    } else {
        document.getElementById('output2').textContent = '✗ Check that you filled in both g and b variables correctly.';
        document.getElementById('output2').className = 'output-area output-error';
    }
}

function unlockExercise3() {
    document.getElementById('code3').disabled = false;
    document.getElementById('code3').placeholder = 'Now type your code here!';
    document.getElementById('run3').disabled = false;
    document.getElementById('check3').disabled = false;
    document.getElementById('hint3btn').disabled = false;
    document.getElementById('status3').textContent = 'Ready';
    document.getElementById('output3').textContent = 'Complete the code and test it!';
}

// Exercise 3
function runCode3() {
    const code = document.getElementById('code3').value;
    const output = document.getElementById('output3');
    try {
        eval(code);
        output.textContent = '✓ Code executed! Check the preview box above.';
        output.className = 'output-area output-success';
    } catch (error) {
        output.textContent = 'Error: ' + error.message;
        output.className = 'output-area output-error';
    }
}

function checkExercise3() {
    const code = document.getElementById('code3').value;
    if (code.includes('newColor') && code.includes('.style.backgroundColor')) {
        document.getElementById('status3').textContent = '✓ Complete';
        document.getElementById('status3').className = 'exercise-status status-complete';
        document.getElementById('output3').textContent = '✓ Perfect! You can now change colors dynamically!';
        document.getElementById('output3').className = 'output-area output-success';
        unlockExercise4();
        updateProgress();
    } else {
        document.getElementById('output3').textContent = '✗ Make sure you\'re using the newColor variable to set the backgroundColor.';
        document.getElementById('output3').className = 'output-area output-error';
    }
}

function unlockExercise4() {
    document.getElementById('code4').disabled = false;
    document.getElementById('code4').placeholder = 'Now type your code here!';
    document.getElementById('run4').disabled = false;
    document.getElementById('check4').disabled = false;
    document.getElementById('hint4btn').disabled = false;
    document.getElementById('status4').textContent = 'Ready';
    document.getElementById('output4').textContent = 'Run the code to activate the button!';
}

// Exercise 4
function runCode4() {
    const code = document.getElementById('code4').value;
    const output = document.getElementById('output4');
    try {
        eval(code);
        output.textContent = '✓ Event listener added! Now click the button in the preview above!';
        output.className = 'output-area output-success';
    } catch (error) {
        output.textContent = 'Error: ' + error.message;
        output.className = 'output-area output-error';
    }
}

function checkExercise4() {
    const code = document.getElementById('code4').value;
    if (code.includes('addEventListener') && code.includes('click')) {
        document.getElementById('status4').textContent = '✓ Complete';
        document.getElementById('status4').className = 'exercise-status status-complete';
        document.getElementById('output4').textContent = '✓ Excellent! You\'ve mastered event listeners!';
        document.getElementById('output4').className = 'output-area output-success';
        unlockExercise5();
        updateProgress();
    } else {
        document.getElementById('output4').textContent = '✗ The code should use addEventListener with a click event.';
        document.getElementById('output4').className = 'output-area output-error';
    }
}

function unlockExercise5() {
    document.getElementById('code5').disabled = false;
    document.getElementById('code5').placeholder = 'Final challenge - you got this!';
    document.getElementById('run5').disabled = false;
    document.getElementById('check5').disabled = false;
    document.getElementById('hint5btn').disabled = false;
    document.getElementById('status5').textContent = 'Ready';
    document.getElementById('output5').textContent = 'Complete the final challenge!';
}

// Exercise 5
function runCode5() {
    const code = document.getElementById('code5').value;
    const output = document.getElementById('output5');
    try {
        eval(code);
        output.textContent = '✓ Code executed! Try clicking the "Generate Color" button above!';
        output.className = 'output-area output-success';
    } catch (error) {
        output.textContent = 'Error: ' + error.message;
        output.className = 'output-area output-error';
    }
}

function checkExercise5() {
    const code = document.getElementById('code5').value;
    if (code.includes('generateRandomColor()') && 
        code.includes('.style.backgroundColor') && 
        code.includes('.textContent')) {
        document.getElementById('status5').textContent = '✓ Complete';
        document.getElementById('status5').className = 'exercise-status status-complete';
        document.getElementById('output5').textContent = '🎉 Congratulations! You built a complete color generator!';
        document.getElementById('output5').className = 'output-area output-success';
        updateProgress();
    } else {
        document.getElementById('output5').textContent = '✗ Make sure you\'re generating a color AND using it to update both the background and text.';
        document.getElementById('output5').className = 'output-area output-error';
    }
}

// Hint toggle function
function toggleHint(hintId) {
    const hint = document.getElementById(hintId);
    hint.classList.toggle('show');
}

// Admin Mode: Ctrl + Alt + U to unlock all exercises
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.altKey && e.key === 'u') {
        e.preventDefault();
        activateAdminMode();
    }
});

function activateAdminMode() {
    // Unlock all exercises
    unlockExercise2();
    unlockExercise3();
    unlockExercise4();
    unlockExercise5();
    
    // Show admin mode notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideIn 0.5s ease;
    `;
    notification.innerHTML = `
        <div style="font-size: 1.2em; margin-bottom: 5px;">🔓 Admin Mode Activated</div>
        <div style="font-size: 0.9em; opacity: 0.9;">All exercises unlocked!</div>
    `;
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
    
    // Add animation keyframes if not already present
    if (!document.getElementById('admin-animations')) {
        const style = document.createElement('style');
        style.id = 'admin-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('🔓 Admin mode activated - all exercises unlocked!');
}

// Smooth scroll for sidebar navigation
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('.lesson-nav a');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href').slice(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
});