// MailerLite Newsletter Form Handler
// Handles form submission and shows success messages

document.addEventListener('DOMContentLoaded', function() {
  // Handle newsletter form submission
  const newsletterForms = document.querySelectorAll('form[action*="mailerlite.com"]');
  
  newsletterForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const emailInput = this.querySelector('input[name="fields[email]"]');
      const submitButton = this.querySelector('button[type="submit"]');
      const email = emailInput.value;
      
      if (!email) return;
      
      // Show loading state
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Subscribing...';
      submitButton.disabled = true;
      
      // Create FormData
      const formData = new FormData(this);
      
      // Submit to MailerLite
      fetch(this.action, {
        method: 'POST',
        body: formData,
        mode: 'no-cors' // MailerLite uses JSONP, so we can't read the response
      })
      .then(() => {
        // Since we can't read the response with no-cors, we assume success
        showSuccessMessage(this);
        this.reset();
        submitButton.textContent = '✓ Subscribed!';
        setTimeout(() => {
          submitButton.textContent = originalText;
          submitButton.disabled = false;
        }, 3000);
      })
      .catch(error => {
        console.error('Subscription error:', error);
        showErrorMessage(this);
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      });
    });
  });
});

function showSuccessMessage(form) {
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
      ✓ You may receive a verification email from Jopin. It's optional — no action is required unless you want to confirm your subscription.
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

function showErrorMessage(form) {
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
      ⚠ Something went wrong. Please try again.
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
