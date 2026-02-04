// Calculator Lesson Interactive JavaScript

// Progress tracking
let completedExercises = 0;
const totalExercises = 6;

function updateProgress() {
    completedExercises++;
    const percentage = (completedExercises / totalExercises) * 100;
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `Progress: ${completedExercises} of ${totalExercises} exercises complete`;
    
    if (completedExercises === totalExercises) {
        setTimeout(() => {
            alert('🎉 Congratulations! You\'ve built a complete calculator app!');
        }, 500);
    }
}

// Admin Mode: Ctrl + Alt + U to unlock all exercises
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.altKey && e.key === 'u') {
        e.preventDefault();
        activateAdminMode();
    }
});

function activateAdminMode() {
    unlockExercise2();
    unlockExercise3();
    unlockExercise4();
    unlockExercise5();
    unlockExercise6();
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = '🎓 Admin Mode: All exercises unlocked!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Exercise 1
function runCode1() {
    const code = document.getElementById('code1').value;
    const preview = document.getElementById('preview1');
    preview.innerHTML = code;
}

function checkExercise1() {
    const code = document.getElementById('code1').value.toLowerCase();
    if (code.includes('input') && code.includes('type="text"') && 
        code.includes('readonly') && code.includes('calculator')) {
        document.getElementById('status1').textContent = '✓ Complete';
        document.getElementById('status1').className = 'exercise-status status-complete';
        updateProgress();
        unlockExercise2();
    } else {
        alert('Make sure you have an input element with type="text" and readonly attribute inside a calculator div!');
    }
}

function unlockExercise2() {
    document.getElementById('code2').disabled = false;
    document.getElementById('run2').disabled = false;
    document.getElementById('check2').disabled = false;
    document.getElementById('hint2btn').disabled = false;
    document.getElementById('status2').textContent = 'Not Started';
    document.getElementById('status2').className = 'exercise-status status-pending';
    document.getElementById('preview2').textContent = 'Click "Run Code" to see your number buttons!';
}

// Exercise 2
function runCode2() {
    const code = document.getElementById('code2').value;
    const preview = document.getElementById('preview2');
    preview.innerHTML = code;
}

function checkExercise2() {
    const code = document.getElementById('code2').value.toLowerCase();
    if (code.includes('<button>') && code.includes('grid') && 
        (code.match(/<button>/g) || []).length >= 10) {
        document.getElementById('status2').textContent = '✓ Complete';
        document.getElementById('status2').className = 'exercise-status status-complete';
        updateProgress();
        unlockExercise3();
    } else {
        alert('Make sure you have at least 10 buttons and use CSS Grid for layout!');
    }
}

function unlockExercise3() {
    document.getElementById('code3').disabled = false;
    document.getElementById('run3').disabled = false;
    document.getElementById('check3').disabled = false;
    document.getElementById('hint3btn').disabled = false;
    document.getElementById('status3').textContent = 'Not Started';
    document.getElementById('status3').className = 'exercise-status status-pending';
    document.getElementById('preview3').textContent = 'Click "Run Code" to see your operation buttons!';
}

// Exercise 3
function runCode3() {
    const code = document.getElementById('code3').value;
    const preview = document.getElementById('preview3');
    preview.innerHTML = code;
}

function checkExercise3() {
    const code = document.getElementById('code3').value.toLowerCase();
    if (code.includes('operator') && code.includes('+') && 
        code.includes('-') && code.includes('*') && code.includes('/')) {
        document.getElementById('status3').textContent = '✓ Complete';
        document.getElementById('status3').className = 'exercise-status status-complete';
        updateProgress();
        unlockExercise4();
    } else {
        alert('Make sure you have all four operations (+, -, *, /) with the "operator" class!');
    }
}

function unlockExercise4() {
    document.getElementById('code4').disabled = false;
    document.getElementById('run4').disabled = false;
    document.getElementById('check4').disabled = false;
    document.getElementById('hint4btn').disabled = false;
    document.getElementById('status4').textContent = 'Not Started';
    document.getElementById('status4').className = 'exercise-status status-pending';
    document.getElementById('preview4').textContent = 'Click "Run Code" to see the complete button layout!';
}

// Exercise 4
function runCode4() {
    const code = document.getElementById('code4').value;
    const preview = document.getElementById('preview4');
    preview.innerHTML = code;
}

function checkExercise4() {
    const code = document.getElementById('code4').value.toLowerCase();
    if (code.includes('clear') && code.includes('equals') && 
        code.includes('>c<') && code.includes('>=<')) {
        document.getElementById('status4').textContent = '✓ Complete';
        document.getElementById('status4').className = 'exercise-status status-complete';
        updateProgress();
        unlockExercise5();
    } else {
        alert('Make sure you have both Clear (C) and Equals (=) buttons with proper classes!');
    }
}

function unlockExercise5() {
    document.getElementById('code5').disabled = false;
    document.getElementById('run5').disabled = false;
    document.getElementById('check5').disabled = false;
    document.getElementById('hint5btn').disabled = false;
    document.getElementById('status5').textContent = 'Not Started';
    document.getElementById('status5').className = 'exercise-status status-pending';
    document.getElementById('preview5').textContent = 'Click "Run Code" to test your calculator logic!';
}

// Exercise 5
function runCode5() {
    const code = document.getElementById('code5').value;
    const preview = document.getElementById('preview5');
    preview.innerHTML = code;
}

function checkExercise5() {
    const code = document.getElementById('code5').value.toLowerCase();
    if (code.includes('function') && code.includes('appendtodisplay') && 
        code.includes('cleardisplay') && code.includes('calculate') && 
        code.includes('eval')) {
        document.getElementById('status5').textContent = '✓ Complete';
        document.getElementById('status5').className = 'exercise-status status-complete';
        updateProgress();
        unlockExercise6();
    } else {
        alert('Make sure you have functions for appendToDisplay, clearDisplay, and calculate with eval!');
    }
}

function unlockExercise6() {
    document.getElementById('code6').disabled = false;
    document.getElementById('run6').disabled = false;
    document.getElementById('check6').disabled = false;
    document.getElementById('hint6btn').disabled = false;
    document.getElementById('status6').textContent = 'Not Started';
    document.getElementById('status6').className = 'exercise-status status-pending';
    document.getElementById('preview6').textContent = 'Click "Run Code" to test your complete calculator!';
}

// Exercise 6
function runCode6() {
    const code = document.getElementById('code6').value;
    const preview = document.getElementById('preview6');
    preview.innerHTML = code;
}

function checkExercise6() {
    const code = document.getElementById('code6').value.toLowerCase();
    if (code.includes('function') && code.includes('onclick') && 
        code.includes('eval') && code.includes('try') && code.includes('catch')) {
        document.getElementById('status6').textContent = '✓ Complete';
        document.getElementById('status6').className = 'exercise-status status-complete';
        updateProgress();
    } else {
        alert('Make sure your complete calculator has onclick handlers, functions, and error handling (try/catch)!');
    }
}

// Hint toggle
function toggleHint(hintId) {
    const hint = document.getElementById(hintId);
    hint.classList.toggle('show');
}

// Smooth scroll
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