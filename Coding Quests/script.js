// Historical events data
const events = [
    {
        year: "1543",
        title: "First Contact with Portuguese Traders",
        description: "Portuguese traders arrive in Japan, introducing firearms, fashion trends, and European cultural influences. This marked the beginning of European contact with Japan and the introduction of new technologies and goods."
    },
    {
        year: "1549",
        title: "Francis Xavier Begins Jesuit Missions",
        description: "Francis Xavier arrives in Japan and begins Jesuit missionary work. Christian missions follow, spreading Christianity throughout various regions of Japan and establishing churches and schools."
    },
    {
        year: "1603",
        title: "Tokugawa Ieyasu Becomes Shogun",
        description: "Tokugawa Ieyasu establishes the Tokugawa Shogunate, beginning over 250 years of political stability and isolation. This period would fundamentally shape Japanese society and culture."
    },
    {
        year: "1614",
        title: "Missionaries Expelled",
        description: "The Shogunate orders the expulsion of all Christian missionaries from Japan. Anyone refusing to abandon Christianity faces execution, marking the beginning of severe persecution of Christians in Japan."
    },
    {
        year: "1639",
        title: "Exclusion Laws Begin",
        description: "The Sakoku (closed country) policy is fully implemented. Japan enters a period of isolation, severely restricting foreign trade and contact. Only limited interaction with the Dutch and Chinese is permitted through Nagasaki."
    },
    {
        year: "1720",
        title: "European Books Allowed",
        description: "The Shogunate relaxes restrictions slightly, allowing the importation of European books (excluding Christian texts). This marks the beginning of rangaku (Dutch learning) and increased interest in Western knowledge."
    },
    {
        year: "1744",
        title: "Astronomy Encouraged",
        description: "The study of Western astronomy is officially encouraged by the Shogunate. Japanese scholars begin to engage more actively with Western scientific knowledge, particularly in the fields of astronomy and mathematics."
    },
    {
        year: "Early 1800s",
        title: "Many Nations Try to Trade",
        description: "Various Western nations, including Britain, Russia, and the United States, make repeated attempts to establish trade relations with Japan. All efforts are rebuffed as Japan maintains its isolationist policy."
    },
    {
        year: "1848",
        title: "Randal MacDonald Arrives",
        description: "Ranald MacDonald, an American adventurer, deliberately shipwrecks himself in Japan to enter the closed country. He teaches English to Japanese interpreters before being expelled, but his influence on Japanese language education persists."
    },
    {
        year: "1854",
        title: "Exclusion Laws End",
        description: "Commodore Matthew Perry's expedition forces Japan to sign the Convention of Kanagawa, effectively ending over 200 years of isolation. Japan opens its ports to American ships, marking the beginning of the Meiji era and rapid modernization."
    },
    {
        year: "1868*",
        title: "Meiji Restoration Begins",
        description: "Emperor Meiji takes power, ending the Tokugawa Shogunate. Japan begins rapid modernization and westernization, transforming from a feudal society into a modern industrial nation."
    },
    {
        year: "1889*",
        title: "First Constitution Adopted",
        description: "Japan adopts the Meiji Constitution, establishing a constitutional monarchy. This marks a significant step in Japan's modernization and adoption of Western political structures."
    },
    {
        year: "1894-1895*",
        title: "First Sino-Japanese War",
        description: "Japan defeats China in the First Sino-Japanese War, establishing itself as a major military power in East Asia and gaining control of Taiwan and the Pescadores Islands."
    }
];

// DOM elements
const timelineEvents = document.getElementById('timelineEvents');
const modalOverlay = document.getElementById('modalOverlay');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalYear = document.getElementById('modalYear');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const timelineContainer = document.getElementById('timelineContainer');
const scrollLeft = document.getElementById('scrollLeft');
const scrollRight = document.getElementById('scrollRight');

// Generate timeline events
function generateTimeline() {
    events.forEach((event, index) => {
        const eventElement = document.createElement('div');
        eventElement.className = 'timeline-event';
        eventElement.dataset.index = index;
        
        eventElement.innerHTML = `
            <div class="event-marker"></div>
            <div class="event-year">${event.year}</div>
            <div class="event-label">${event.title}</div>
        `;
        
        eventElement.addEventListener('click', () => openModal(index));
        timelineEvents.appendChild(eventElement);
    });
}

// Open modal with event details
function openModal(index) {
    const event = events[index];
    
    // Update active state
    document.querySelectorAll('.timeline-event').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`[data-index="${index}"]`).classList.add('active');
    
    // Update modal content
    modalYear.textContent = event.year;
    modalTitle.textContent = event.title;
    modalDescription.textContent = event.description;
    
    // Show modal
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Remove active state after animation
    setTimeout(() => {
        document.querySelectorAll('.timeline-event').forEach(el => {
            el.classList.remove('active');
        });
    }, 300);
}

// Scroll functions
function scrollTimelineLeft() {
    timelineContainer.scrollBy({
        left: -300,
        behavior: 'smooth'
    });
}

function scrollTimelineRight() {
    timelineContainer.scrollBy({
        left: 300,
        behavior: 'smooth'
    });
}

// Event listeners
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
        closeModal();
    }
});

scrollLeft.addEventListener('click', scrollTimelineLeft);
scrollRight.addEventListener('click', scrollTimelineRight);

// Keyboard navigation for timeline
document.addEventListener('keydown', (e) => {
    if (!modalOverlay.classList.contains('active')) {
        if (e.key === 'ArrowLeft') {
            scrollTimelineLeft();
        } else if (e.key === 'ArrowRight') {
            scrollTimelineRight();
        }
    }
});

// Mouse wheel scroll using native scrollbar behavior
timelineContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    timelineContainer.scrollBy({
        left: e.deltaY,
        behavior: 'auto'
    });
});

// Initialize timeline
generateTimeline();
