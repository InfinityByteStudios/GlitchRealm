// Get references to HTML elements
// This finds the button and color display area from the HTML
const button = document.getElementById('generateBtn');
const colorDisplay = document.getElementById('colorDisplay');

/**
 * Function to generate a random hexadecimal color
 * Returns a string like "#A3F5B2"
 */
function generateRandomColor() {
    // Generate random values for red, green, and blue
    // Math.random() gives us a number between 0 and 1
    // We multiply by 256 to get 0-255, then floor it to remove decimals
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    
    // Convert each number to hexadecimal format
    // toString(16) converts to base-16 (hexadecimal)
    // padStart(2, '0') ensures we always have 2 digits (e.g., "09" not "9")
    const hexR = r.toString(16).padStart(2, '0');
    const hexG = g.toString(16).padStart(2, '0');
    const hexB = b.toString(16).padStart(2, '0');
    
    // Combine into final hex color code
    const hexColor = '#' + hexR + hexG + hexB;
    
    // Return uppercase for consistency
    return hexColor.toUpperCase();
}

/**
 * Function to update the page with a new color
 */
function updateColor() {
    // Generate a new random color
    const newColor = generateRandomColor();
    
    // Change the background color of the entire page
    document.body.style.backgroundColor = newColor;
    
    // Update the text in the color display box
    colorDisplay.textContent = newColor;
    
    // Optional: Log to console for debugging
    console.log('New color generated:', newColor);
}

// Add event listener to button
// This runs the updateColor function every time the button is clicked
button.addEventListener('click', updateColor);

// Optional: Generate initial color when page loads
// Uncomment the line below if you want a random color on page load
// updateColor();