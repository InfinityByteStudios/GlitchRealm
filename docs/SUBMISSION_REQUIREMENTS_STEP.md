# Game Submission Requirements Step - Implementation

## Overview
Added a requirements and guidelines screen that users must review and accept before accessing the game submission form.

## What Changed

### New UI Flow
1. **Step Indicator** (shows current progress)
   - Visual progress tracker at top
   - Step 1: Requirements and Guidelines (active with cyan glow)
   - Step 2: Submit Your Game (inactive/gray)
   - Connecting line shows progress

2. **Requirements Card** (shows first)
   - Submission requirements list
   - Content guidelines
   - What you will need section
   - Acceptance checkbox
   - "Next" button (disabled until checkbox is checked)

3. **Submission Form** (shows after clicking "Next")
   - Step indicator updates to Step 2 (Step 1 shows as completed)
   - Back button to return to requirements
   - Original game submission form
   - Only visible after accepting terms

4. **Navigation**
   - "Next" button proceeds from requirements to form (updates step indicator)
   - "Back to Requirements" button returns from form to requirements (updates step indicator)
   - Both transitions include smooth scroll to top
   - Step indicator always shows current position

### Features Added

#### Requirements Section
- Verification status requirement
- Game hosting requirements
- Functionality expectations
- Cover image recommendations
- Draft status explanation

#### Content Guidelines
- No offensive content
- No copyright infringement
- No malicious code
- General audience requirement
- Intellectual property respect

#### Information Box
- Lists required fields (title, description, play URL)
- Lists optional fields (cover image, tags, badge)
- Character limits (120 for title, 1000 for description)

#### Acceptance Mechanism
- Checkbox: "I have read and agree to follow the submission guidelines..."
- "Next" button disabled until checkbox is checked
- Smooth scroll to top when proceeding to form

## Technical Implementation

### CSS Additions
```css
.requirements-card - Main container with same styling as submit card
.requirements-section - Section dividers with headings
.requirements-list - Bulleted list with cyan dot indicators
.guidelines-box - Blue info box for "What You Will Need"
.acceptance-box - Orange-bordered checkbox area
.btn-next - Prominent "Next" button with hover effects
.back-to-requirements - Container for back button
.btn-back - Subtle back button with arrow icon (← character)
.step-indicator - Flexbox container for step numbers
.step - Individual step wrapper
.step-number - Circular numbered badge (40px diameter)
.step-number.active - Active step (cyan glow, highlighted)
.step-number.completed - Completed step (green color)
.step-line - Connecting line between steps (60px width)
.step-line.completed - Line when step is passed (green color)
```

### JavaScript Logic
```javascript
// Update step indicator visual state
updateStepIndicator(currentStep) {
  if (currentStep === 1) {
    step1: active (cyan glow)
    step2: inactive (gray)
    line1: not completed
  } else if (currentStep === 2) {
    step1: completed (green checkmark style)
    step2: active (cyan glow)
    line1: completed (green)
  }
}

// Show requirements card instead of submit card initially
gate() function updated to show requirementsCard first
Sets step indicator to step 1

// Checkbox enables "Next" button
acceptTerms.addEventListener('change', () => {
  proceedBtn.disabled = !acceptTerms.checked;
});

// "Next" button transitions to submit form
proceedBtn.addEventListener('click', () => {
  requirementsCard.style.display = 'none';
  submitCard.style.display = '';
  updateStepIndicator(2); // Update to step 2
  window.scrollTo({top: 0, behavior: 'smooth'});
});

// "Back" button returns to requirements
backBtn.addEventListener('click', () => {
  submitCard.style.display = 'none';
  requirementsCard.style.display = '';
  updateStepIndicator(1); // Back to step 1
  window.scrollTo({top: 0, behavior: 'smooth'});
});
```

### State Flow
1. User signs in → Requirements card shows → Step indicator shows "1" active
2. User reads requirements
3. User checks acceptance checkbox → "Next" button enables
4. User clicks "Next" → Requirements card hides, submit form shows → Step indicator updates to "2" active, "1" completed
5. User can click "Back to Requirements" → Submit form hides, requirements card shows → Step indicator updates to "1" active
6. User can navigate back and forth as needed → Step indicator always reflects current position
7. User completes and submits game from the form

## Design Choices

### Visual Style
- Consistent with existing GlitchRealm design system
- Cyan accents and glowing effects
- Radial gradient overlays
- Same card styling as submit form for visual continuity

### UX Considerations
- **Enforced reading**: User must interact with checkbox, ensuring they see the requirements
- **Clear expectations**: Lists exactly what is needed before they start
- **Smooth transition**: Scroll to top when moving between steps
- **Bidirectional navigation**: Users can go back to review requirements at any time
- **Non-destructive back**: Form data is preserved when navigating back and forth
- **No emojis**: Clean, professional text as requested
- **Visual feedback**: Back button has arrow icon (← character) and hover effects

### Accessibility
- Checkbox properly labeled with `for` attribute
- Button disabled state clearly indicated (40% opacity)
- Semantic list structure with `<ul>` and `<li>`
- Focus states on interactive elements

## Content Structure

### Before You Submit (5 requirements)
1. Verified creator/developer status
2. Public URL hosting
3. Functional game
4. Cover image prepared
5. Draft status understanding

### Content Guidelines (5 rules)
1. No offensive content
2. No copyright issues
3. No malicious code
4. General audience appropriate
5. IP rights respect

### What You Will Need
- Required fields explicitly listed
- Optional fields clearly marked
- Character limits stated upfront
- Note about review process

## Testing Checklist

- [ ] Requirements card shows first for verified users
- [ ] "Next" button is disabled initially
- [ ] Checking the checkbox enables the "Next" button
- [ ] Unchecking disables the button again
- [ ] Clicking "Next" hides requirements and shows form
- [ ] Page scrolls to top on transition
- [ ] "Back to Requirements" button is visible on submit form
- [ ] Clicking "Back to Requirements" returns to requirements card
- [ ] Form data is preserved when navigating back and forth
- [ ] Checkbox state is maintained when returning to requirements
- [ ] Back button has hover effect
- [ ] Arrow icon displays correctly in back button
- [ ] All text is readable and properly formatted
- [ ] Cyan dot bullets display correctly
- [ ] Info boxes have proper contrast
- [ ] Mobile responsive layout works
- [ ] Browser back button behavior is normal

## Future Enhancements

### Potential Additions
1. **Progress indicator**: "Step 1 of 2" header
2. ~~**Back button**: On submit form to return to requirements~~ ✓ IMPLEMENTED
3. **Save progress**: Remember checkbox state in sessionStorage
4. **Requirements version**: Track when guidelines were last updated
5. **Expandable sections**: Collapsible requirement details
6. **Visual examples**: Screenshots of good vs bad submissions
7. **FAQ section**: Common questions about submission process
8. **Estimated time**: "This will take approximately 5-10 minutes"
9. **Form validation preview**: Show which fields are required before proceeding
10. **Confirmation dialog**: Warn if user tries to leave with unsaved form data

### Analytics Opportunities
- Track how many users check the box vs abandon
- Measure time spent on requirements page
- Monitor drop-off rates between steps
- A/B test different wording for conversion

## Related Files

- **submit-game.html** - Main file with requirements card and form
- **styles.css** - Base styles (reused for consistency)
- **script.js** - Shared authentication and utilities

## Status
Status: IMPLEMENTED (with back navigation)
Features:
- Requirements and guidelines screen ✓
- Acceptance checkbox with validation ✓
- Next button to proceed to form ✓
- Back button to review requirements ✓
- Smooth transitions with scroll ✓
- Form data preservation ✓
- No emojis (clean, professional) ✓
