class MealPlanApp {
    constructor() {
        this.data = {};
        this.saveTimeout = null;
        this.clickCounts = new Map(); // Track click counts for double-click detection
        this.clickTimers = new Map(); // Track click timers
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.populateFields();
    }

    async loadData() {
        try {
            const response = await fetch('/api/data');
            if (response.ok) {
                this.data = await response.json();
                console.log('Loaded data from server');
                return;
            }
        } catch (error) {
            console.warn('Server not available, trying localStorage');
        }
        
        // Fallback to localStorage for static deployments
        const savedData = localStorage.getItem('mealPlanData');
        if (savedData) {
            try {
                this.data = JSON.parse(savedData);
                console.log('Loaded data from localStorage');
                return;
            } catch (error) {
                console.warn('Invalid localStorage data, using defaults');
            }
        }
        
        // Final fallback to defaults
        console.log('Using default data');
        this.data = this.getDefaultData();
    }

    getDefaultData() {
        return {
            // Day 1: Saturday 6/21
            "day1-where": "Fazio house",
            "day1-meal1-title": "Soup & Sandwiches and chips",
            "day1-meal1-shopping": "Fazio",
            "day1-meal1-prep": "Fazio",
            "day1-meal1-eaters": "All but Paul",

            // Day 2: Sunday 6/22
            "day2-where": "Fazio house",
            "day2-meal1-title": "Meat",
            "day2-meal1-shopping": "Fazio",
            "day2-meal1-prep": "Fazio",
            "day2-meal1-eaters": "All but paul",

            // Day 3: Monday 6/23
            "day3-where": "Paul's house",
            "day3-meal1-title": "Pizza",
            "day3-meal1-shopping": "paul",
            "day3-meal1-ingredients": "Black olives, mushrooms, onions, green bell peppers, chicken, pineapple",
            "day3-meal1-prep": "Paul",
            "day3-meal1-eaters": "All",

            // Day 4: Tuesday 6/24
            "day4-context": "(Rachel's birthday)",

            // Day 5: Wednesday 6/25
            "day5-where": "Paul's house",
            "day5-meal1-title": "Breakfast foods",
            "day5-meal1-shopping": "Fazio",
            "day5-meal1-ingredients": "eggs, veg sausage",
            "day5-meal1-prep": "Fazio",
            "day5-meal1-eaters": "all but Sal & Paul",
            "day5-meal2-title": "Breakfast foods",
            "day5-meal2-shopping": "Paul",
            "day5-meal2-ingredients": "waffles, fruit (options: blueberries, strawberries, pineapple, kiwi)",
            "day5-meal2-prep": "Paul",
            "day5-meal2-eaters": "all but Sal",

            // Day 6: Thursday 6/26
            "day6-context": "(With Sarah)",
            "day6-where": "[Eem on N. Williams](https://www.eempdx.com/)",

            // Day 7: Friday 6/27
            "day7-where": "Fazio house",
            "day7-meal1-title": "Pad Thai",
            "day7-meal1-shopping": "Fazio",
            "day7-meal1-prep": "Fazio",
            "day7-meal1-eaters": "Rach, Hailey, Sal",
            "day7-meal2-title": "Bring food",
            "day7-meal2-eaters": "Mom, Dad, Paul",

            // Day 8: Saturday 6/28
            "day8-context": "(Hailey brings leftover Pad Thai)",
            "day8-where": "Restaurant TBD",

            // Day 9: Sunday 6/29
            "day9-context": "(Hailey's birthday)",
            "day9-where": "Fazio house",
            "day9-meal1-title": "Omelettes, grits, fruit, & veggie sausage",
            "day9-meal1-shopping": "Fazio",
            "day9-meal1-prep": "Fazio",
            "day9-meal1-eaters": "All",
            "day9-meal2-title": "Roasted pumpkin Thai risotto / Spiced Pumpkin muffins",
            "day9-meal2-shopping": "Paul",
            "day9-meal2-prep": "Paul",
            "day9-meal2-eaters": "All"
        };
    }

    // Convert markdown links to HTML
    renderMarkdown(text) {
        if (!text) return '';
        
        // Simple markdown link pattern: [text](url)
        return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }

    // Convert HTML links back to markdown for editing
    htmlToMarkdown(html) {
        if (!html) return '';
        
        // Convert HTML links back to markdown
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        const links = temp.querySelectorAll('a');
        links.forEach(link => {
            const markdown = `[${link.textContent}](${link.href})`;
            link.outerHTML = markdown;
        });
        
        return temp.textContent || temp.innerText || '';
    }

    populateFields() {
        document.querySelectorAll('.editable[data-key]').forEach(element => {
            const key = element.getAttribute('data-key');
            if (this.data[key] !== undefined) {
                const renderedContent = this.renderMarkdown(this.data[key]);
                if (renderedContent !== this.data[key]) {
                    // Contains markdown links, render as HTML
                    element.innerHTML = renderedContent;
                } else {
                    // Plain text
                    element.textContent = this.data[key];
                }
            }
            // Ensure all fields start as non-editable
            element.contentEditable = false;
        });
    }

    setupEventListeners() {
        document.querySelectorAll('.editable[data-key]').forEach(element => {
            // Handle clicks for double-click editing and single-click links
            element.addEventListener('click', (e) => {
                this.handleClick(e);
            });

            element.addEventListener('blur', (e) => {
                this.handleEdit(e.target);
            });

            element.addEventListener('keydown', (e) => {
                // Save on Enter key (unless it's a multi-line field and shift isn't held)
                if (e.key === 'Enter' && !e.shiftKey) {
                    const isMultiLine = this.isMultiLineField(e.target);
                    if (!isMultiLine) {
                        e.preventDefault();
                        e.target.blur();
                    }
                }
                // Save on Escape key
                if (e.key === 'Escape') {
                    e.target.blur();
                }
            });

            element.addEventListener('input', (e) => {
                // Debounced save for multi-line fields
                if (this.isMultiLineField(e.target)) {
                    this.debouncedSave(e.target);
                }
            });
        });
    }

    handleClick(e) {
        // Find the editable element
        const editableElement = e.target.closest('.editable');
        if (!editableElement) return;

        const elementId = editableElement.getAttribute('data-key');
        
        // If clicking on a link, check if it's a double-click
        if (e.target.tagName === 'A') {
            // Get current click count for double-click detection
            const currentCount = this.clickCounts.get(elementId) || 0;
            const newCount = currentCount + 1;

            // Clear existing timer
            if (this.clickTimers.has(elementId)) {
                clearTimeout(this.clickTimers.get(elementId));
            }

            if (newCount === 1) {
                // First click on link - start timer but allow navigation
                this.clickCounts.set(elementId, 1);
                
                const timer = setTimeout(() => {
                    // Reset count after timeout
                    this.clickCounts.set(elementId, 0);
                    this.clickTimers.delete(elementId);
                }, 400);
                
                this.clickTimers.set(elementId, timer);
                // Don't prevent default - let the link navigate
                return;
                
            } else if (newCount === 2) {
                // Second click on link - prevent navigation and enter edit mode
                e.preventDefault();
                this.clickCounts.set(elementId, 0);
                clearTimeout(this.clickTimers.get(elementId));
                this.clickTimers.delete(elementId);
                
                this.enterEditMode(editableElement);
                return;
            }
        }

        // For non-link clicks, prevent default and handle double-click
        e.preventDefault();
        
        // Get current click count
        const currentCount = this.clickCounts.get(elementId) || 0;
        const newCount = currentCount + 1;

        // Clear existing timer
        if (this.clickTimers.has(elementId)) {
            clearTimeout(this.clickTimers.get(elementId));
        }

        if (newCount === 1) {
            // First click - start timer
            this.clickCounts.set(elementId, 1);
            
            const timer = setTimeout(() => {
                // Reset count after timeout
                this.clickCounts.set(elementId, 0);
                this.clickTimers.delete(elementId);
            }, 400); // 400ms window for double click
            
            this.clickTimers.set(elementId, timer);
            
        } else if (newCount === 2) {
            // Second click - enter edit mode
            this.clickCounts.set(elementId, 0);
            clearTimeout(this.clickTimers.get(elementId));
            this.clickTimers.delete(elementId);
            
            this.enterEditMode(editableElement);
        }
    }

    enterEditMode(element) {
        // Convert any HTML content back to markdown for editing
        const key = element.getAttribute('data-key');
        const currentData = this.data[key] || '';
        
        // Set contenteditable to true and focus
        element.contentEditable = true;
        element.textContent = currentData; // Show raw markdown for editing
        element.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Visual feedback for edit mode
        element.classList.add('editing');
    }

    isMultiLineField(element) {
        const key = element.getAttribute('data-key');
        // Ingredients fields are multi-line
        return key && key.includes('ingredients');
    }

    handleEdit(element) {
        const key = element.getAttribute('data-key');
        const value = element.textContent.trim();
        
        // Exit edit mode
        element.contentEditable = false;
        element.classList.remove('editing');
        
        // Update data
        this.data[key] = value;
        
        // Re-render the field to show any markdown formatting
        const renderedContent = this.renderMarkdown(value);
        if (renderedContent !== value) {
            element.innerHTML = renderedContent;
        } else {
            element.textContent = value;
        }
        
        this.saveData(element);
    }

    debouncedSave(element) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.handleEdit(element);
        }, 1000); // Save 1 second after user stops typing
    }

    async saveData(element) {
        element.classList.add('saving');
        
        try {
            const response = await fetch('/api/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.data)
            });

            if (!response.ok) {
                throw new Error('Failed to save data');
            }

            // Visual feedback for successful save
            setTimeout(() => {
                element.classList.remove('saving');
                element.classList.add('success');
                setTimeout(() => {
                    element.classList.remove('success');
                }, 1000);
            }, 200);

        } catch (error) {
            console.warn('Server save failed, using localStorage:', error);
            
            // Fallback to localStorage for static deployments
            try {
                localStorage.setItem('mealPlanData', JSON.stringify(this.data));
                console.log('Data saved to localStorage');
                
                // Visual feedback for successful save
                setTimeout(() => {
                    element.classList.remove('saving');
                    element.classList.add('success');
                    setTimeout(() => {
                        element.classList.remove('success');
                    }, 1000);
                }, 200);
                
            } catch (localError) {
                console.error('localStorage save failed:', localError);
                element.classList.remove('saving');
                
                // Visual feedback for save error
                element.classList.add('error');
                setTimeout(() => {
                    element.classList.remove('error');
                }, 2000);

                // Show user-friendly error message
                this.showNotification('Failed to save changes. Please try again.', 'error');
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-size: 14px;
            font-weight: 500;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MealPlanApp();
});

// Add keyboard shortcuts info
document.addEventListener('keydown', (e) => {
    if (e.key === '?' && e.shiftKey) {
        alert('Keyboard shortcuts:\n- Double-click: Edit field\n- Shift + Enter: New line (for ingredients)\n- Escape: Cancel edit\n- Single-click: Follow links');
    }
}); 