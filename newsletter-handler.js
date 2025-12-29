// SendFox Newsletter Form Handler (via Netlify serverless function)
// Handles form submission and shows success messages

document.addEventListener('DOMContentLoaded', function() {
  // Handle newsletter form submission
  const newsletterForms = document.querySelectorAll('form[data-newsletter-form]');
  
  newsletterForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const emailInput = this.querySelector('input[type="email"]');
      const submitButton = this.querySelector('button[type="submit"]');
      const email = emailInput?.value;
      
      if (!email) return;
      
      // Show loading state
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Subscribing...';
      submitButton.disabled = true;
      
      // Submit to SendFox via serverless function
      fetch('/.netlify/functions/subscribe-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          showSuccessMessage(this, data.message);
          this.reset();
          submitButton.textContent = '✓ Subscribed!';
          setTimeout(() => {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
          }, 3000);
        } else {
          showErrorMessage(this, data.error || 'Something went wrong');
          submitButton.textContent = originalText;
          submitButton.disabled = false;
        }
      })
      .catch(error => {
        console.error('Subscription error:', error);
        showErrorMessage(this, 'Unable to connect. Please try again.');
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      });
    });
  });
});

function showSuccessMessage(form, customMessage) {
  // Create success message
  const message = document.createElement('div');
  message.className = 'newsletter-success-message';
  message.innerHTML = `
    <div style="
      background: linear-gradient(135deg, rgba(0, 255, 65, 0.15), rgba(0, 200, 50, 0.15));
      border: 1px solid #00ff41;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 10px;
      color: #00ff41;
      font-size: 0.8rem;
      text-align: center;
      animation: slideIn 0.3s ease-out;
    ">
      ✓ ${customMessage || 'Success! Check your email to confirm your subscription.'}
    </div>
  `;
  
  // Remove existing messages
  const existingMessage = form.parentElement.querySelector('.newsletter-success-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Add message after form
  form.parentElement.insertBefore(message, form.nextSibling);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (message.parentElement) {
      message.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => message.remove(), 300);
    }
  }, 5000);
}

function showErrorMessage(form, customMessage) {
  // Create error message
  const message = document.createElement('div');
  message.className = 'newsletter-error-message';
  message.innerHTML = `
    <div style="
      background: rgba(255, 0, 128, 0.15);
      border: 1px solid #ff0080;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 10px;
      color: #ff0080;
      font-size: 0.8rem;
      text-align: center;
      animation: slideIn 0.3s ease-out;
    ">
      ⚠ ${customMessage || 'Something went wrong. Please try again.'}
    </div>
  `;
  
  // Remove existing messages
  const existingMessage = form.parentElement.querySelector('.newsletter-error-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Add message after form
  form.parentElement.insertBefore(message, form.nextSibling);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (message.parentElement) {
      message.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => message.remove(), 300);
    }
  }, 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
`;
document.head.appendChild(style);
