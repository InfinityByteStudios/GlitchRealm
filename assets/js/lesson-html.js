// HTML Lesson Interactive JavaScript

// Progress tracking
let completedExercises = 0;
const totalExercises = 7;

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
    unlockExercise7();
    
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
    
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
}

// Exercise 1
function runCode1() {
    const code = document.getElementById('code1').value;
    const preview = document.getElementById('preview1');
    preview.innerHTML = code;
}

function checkExercise1() {
    const code = document.getElementById('code1').value.toLowerCase();
    if (code.includes('<h1>') && code.includes('</h1>') && 
        code.includes('<p>') && code.includes('</p>')) {
        document.getElementById('status1').textContent = '✓ Complete';
        document.getElementById('status1').className = 'exercise-status status-complete';
        unlockExercise2();
        updateProgress();
    } else {
        alert('Make sure you have both <h1> and <p> tags with content!');
    }
}

function unlockExercise2() {
    document.getElementById('code2').disabled = false;
    document.getElementById('run2').disabled = false;
    document.getElementById('check2').disabled = false;
    document.getElementById('hint2btn').disabled = false;
    document.getElementById('status2').textContent = 'Ready';
    document.getElementById('preview2').textContent = 'Fill in your information and click Run!';
}

// Exercise 2
function runCode2() {
    const code = document.getElementById('code2').value;
    const preview = document.getElementById('preview2');
    preview.innerHTML = code;
}

function checkExercise2() {
    const code = document.getElementById('code2').value.toLowerCase();
    if (code.includes('<h1>') && code.includes('<h2>') && 
        code.includes('<p>') && code.split('<p>').length >= 3) {
        document.getElementById('status2').textContent = '✓ Complete';
        document.getElementById('status2').className = 'exercise-status status-complete';
        unlockExercise3();
        updateProgress();
    } else {
        alert('Make sure you have an <h1>, <h2>, and multiple <p> tags!');
    }
}

function unlockExercise3() {
    document.getElementById('code3').disabled = false;
    document.getElementById('run3').disabled = false;
    document.getElementById('check3').disabled = false;
    document.getElementById('hint3btn').disabled = false;
    document.getElementById('status3').textContent = 'Ready';
    document.getElementById('preview3').textContent = 'Create your list and click Run!';
}

// Exercise 3
function runCode3() {
    const code = document.getElementById('code3').value;
    const preview = document.getElementById('preview3');
    preview.innerHTML = code;
}

function checkExercise3() {
    const code = document.getElementById('code3').value.toLowerCase();
    if (code.includes('<ul>') && code.includes('</ul>') && 
        code.includes('<li>') && code.includes('<a href=')) {
        document.getElementById('status3').textContent = '✓ Complete';
        document.getElementById('status3').className = 'exercise-status status-complete';
        unlockExercise4();
        updateProgress();
    } else {
        alert('Make sure you have a <ul> list with <li> items and an <a> link!');
    }
}

function unlockExercise4() {
    document.getElementById('code4').disabled = false;
    document.getElementById('run4').disabled = false;
    document.getElementById('check4').disabled = false;
    document.getElementById('hint4btn').disabled = false;
    document.getElementById('status4').textContent = 'Ready';
    document.getElementById('preview4').textContent = 'Add your image and click Run!';
}

// Exercise 4
function runCode4() {
    const code = document.getElementById('code4').value;
    const preview = document.getElementById('preview4');
    preview.innerHTML = code;
}

function checkExercise4() {
    const code = document.getElementById('code4').value.toLowerCase();
    if (code.includes('<img') && code.includes('src=') && code.includes('alt=')) {
        document.getElementById('status4').textContent = '✓ Complete';
        document.getElementById('status4').className = 'exercise-status status-complete';
        unlockExercise5();
        updateProgress();
    } else {
        alert('Make sure your <img> tag has both src and alt attributes!');
    }
}

function unlockExercise5() {
    document.getElementById('code5').disabled = false;
    document.getElementById('run5').disabled = false;
    document.getElementById('check5').disabled = false;
    document.getElementById('hint5btn').disabled = false;
    document.getElementById('status5').textContent = 'Ready';
    document.getElementById('preview5').textContent = 'Build your complete profile!';
}

// Exercise 5
function runCode5() {
    const code = document.getElementById('code5').value;
    const preview = document.getElementById('preview5');
    preview.innerHTML = code;
}

function checkExercise5() {
    const code = document.getElementById('code5').value.toLowerCase();
    if (code.includes('<table') && code.includes('<tr>') && 
        code.includes('<th>') && code.includes('<td>')) {
        document.getElementById('status5').textContent = '✓ Complete';
        document.getElementById('status5').className = 'exercise-status status-complete';
        updateProgress();
        unlockExercise6();
    } else {
        alert('Make sure you include all table elements: table, tr, th, and td!');
    }
}

function unlockExercise6() {
    document.getElementById('code6').disabled = false;
    document.getElementById('run6').disabled = false;
    document.getElementById('check6').disabled = false;
    document.getElementById('hint6btn').disabled = false;
    document.getElementById('status6').textContent = 'Not Started';
    document.getElementById('status6').className = 'exercise-status status-pending';
    document.getElementById('preview6').textContent = 'Click "Run Code" to see your form!';
}

// Exercise 6
function runCode6() {
    const code = document.getElementById('code6').value;
    const preview = document.getElementById('preview6');
    preview.innerHTML = code;
}

function checkExercise6() {
    const code = document.getElementById('code6').value.toLowerCase();
    if (code.includes('<form') && code.includes('<input') && 
        code.includes('<label') && code.includes('<button')) {
        document.getElementById('status6').textContent = '✓ Complete';
        document.getElementById('status6').className = 'exercise-status status-complete';
        updateProgress();
        unlockExercise7();
    } else {
        alert('Make sure you include all form elements: form, input, label, and button!');
    }
}

function unlockExercise7() {
    document.getElementById('code7').disabled = false;
    document.getElementById('run7').disabled = false;
    document.getElementById('check7').disabled = false;
    document.getElementById('hint7btn').disabled = false;
    document.getElementById('status7').textContent = 'Not Started';
    document.getElementById('status7').className = 'exercise-status status-pending';
    document.getElementById('preview7').textContent = 'Click "Run Code" to see your complete profile page!';
}

// Exercise 7
function runCode7() {
    const code = document.getElementById('code7').value;
    const preview = document.getElementById('preview7');
    preview.innerHTML = code;
}

function checkExercise7() {
    const code = document.getElementById('code7').value.toLowerCase();
    if (code.includes('<h1>') && code.includes('<h2>') && 
        code.includes('<p>') && code.includes('<ul>') && 
        code.includes('<li>') && code.includes('<a ') && 
        code.includes('<img') && code.includes('<table') &&
        code.includes('<form')) {
        document.getElementById('status7').textContent = '✓ Complete';
        document.getElementById('status7').className = 'exercise-status status-complete';
        updateProgress();
    } else {
        alert('Make sure you include ALL elements: h1, h2, p, ul, li, a, img, table, and form!');
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