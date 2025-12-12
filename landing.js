/* ====== VICTORY BAZAAR LANDING PAGE JS ====== */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Victory Bazaar Landing Page Loaded');
    
    // ====== CURRENT YEAR IN FOOTER ======
    const currentYear = new Date().getFullYear();
    document.getElementById('currentYear').textContent = currentYear;
    
    // ====== NAVIGATION SCROLL EFFECT ======
    const landingNav = document.querySelector('.landing-nav');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            landingNav.style.background = 'rgba(255, 255, 255, 0.98)';
            landingNav.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
        } else {
            landingNav.style.background = 'rgba(255, 255, 255, 0.95)';
            landingNav.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.08)';
        }
    });
    
    // ====== SMOOTH SCROLL FOR NAV LINKS ======
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's a regular link or main store link
            if (href.includes('index.html') || href.includes('http')) {
                return;
            }
            
            e.preventDefault();
            
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                closeMobileMenu();
            }
        });
    });
    
    // ====== MOBILE MENU FUNCTIONALITY ======
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMobileMenuBtn = document.getElementById('closeMobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenuOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeMobileMenuBtn) {
        closeMobileMenuBtn.addEventListener('click', closeMobileMenu);
    }
    
    // Close mobile menu when clicking outside
    mobileMenuOverlay.addEventListener('click', function(e) {
        if (e.target === mobileMenuOverlay) {
            closeMobileMenu();
        }
    });
    
    function closeMobileMenu() {
        mobileMenuOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // ====== HERO BUTTON FUNCTIONALITY ======
    const startShoppingBtn = document.getElementById('startShoppingBtn');
    const businessAccountBtn = document.getElementById('businessAccountBtn');
    
    if (startShoppingBtn) {
        startShoppingBtn.addEventListener('click', function(e) {
            // Add loading animation
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Store...';
            this.classList.add('loading');
            
            // Redirect to main store after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        });
    }
    
    if (businessAccountBtn) {
        businessAccountBtn.addEventListener('click', function(e) {
            // Add loading animation
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening Business Portal...';
            this.classList.add('loading');
            
            // Redirect to main store's supplier overlay
            setTimeout(() => {
                window.location.href = 'index.html#supplierOverlay';
            }, 500);
        });
    }
    
    // ====== UPDATE TEAM MEMBER DETAILS ======
    updateTeamDetails();
    
    function updateTeamDetails() {
        // Update CTO details
        const ctoElements = document.querySelectorAll('.team-member .member-info h3');
        ctoElements.forEach(el => {
            if (el.textContent.includes('Mukesh Pandey')) {
                // Update the parent info
                const memberInfo = el.closest('.member-info');
                const metaElement = memberInfo.querySelector('.member-meta');
                const bioElement = memberInfo.querySelector('.member-bio');
                const storyElement = memberInfo.querySelector('.member-story');
                
                if (metaElement) {
                    metaElement.innerHTML = `
                        <span class="age"><i class="fas fa-birthday-cake"></i> Age 28</span>
                        <span class="profession"><i class="fas fa-laptop-code"></i> Professional Developer</span>
                    `;
                }
                
                if (bioElement) {
                    bioElement.innerHTML = `
                        A seasoned software engineer with 8+ years of experience in AI and web development. 
                        When he heard about the founder's vision for an AI-powered e-commerce platform, 
                        he immediately joined to lead the technical development. His expertise in machine 
                        learning and scalable systems made our AI assistant a reality.
                    `;
                }
                
                if (storyElement) {
                    storyElement.innerHTML = `
                        <strong>💻 Technical Lead:</strong> Joined as the first technical team member, 
                        built the entire AI infrastructure from scratch!
                    `;
                }
            }
        });
        
        // Update Market Manager details
        const managerElements = document.querySelectorAll('.team-member .member-info h3');
        managerElements.forEach(el => {
            if (el.textContent === 'Arjun Singh') {
                el.textContent = 'Krishna Singh';
                
                const memberInfo = el.closest('.member-info');
                const bioElement = memberInfo.querySelector('.member-bio');
                const storyElement = memberInfo.querySelector('.member-story');
                
                if (bioElement) {
                    bioElement.innerHTML = `
                        Our marketing prodigy Krishna Singh who understands youth trends better than anyone. 
                        Manages our social media presence, creates engaging content, and runs targeted ad campaigns. 
                        His understanding of digital marketing and brand building is exceptional for his age.
                    `;
                }
                
                if (storyElement) {
                    storyElement.innerHTML = `
                        <strong>📱 Joined:</strong> When he heard about the project, 
                        he immediately offered to handle all marketing and brand strategy!
                    `;
                }
            }
        });
    }
    
    // ====== INTERACTIVE AI CHAT PREVIEW ======
    const aiChatPreview = document.querySelector('.ai-chat-preview');
    
    if (aiChatPreview) {
        // Add typing animation to AI chat
        setTimeout(() => {
            const typingMessage = document.createElement('div');
            typingMessage.className = 'chat-message ai typing';
            typingMessage.innerHTML = `
                <div class="avatar">AI</div>
                <div class="message">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
            aiChatPreview.appendChild(typingMessage);
            
            // Show response after typing
            setTimeout(() => {
                typingMessage.remove();
                
                const responseMessage = document.createElement('div');
                responseMessage.className = 'chat-message ai';
                responseMessage.innerHTML = `
                    <div class="avatar">AI</div>
                    <div class="message">I found 3 perfect matches in your budget! Check them out.</div>
                `;
                responseMessage.style.animation = 'fadeInUp 0.5s ease forwards';
                aiChatPreview.appendChild(responseMessage);
                
                // Scroll to show new message
                aiChatPreview.scrollTop = aiChatPreview.scrollHeight;
            }, 2000);
        }, 3000);
    }
    
    // ====== TEAM MEMBER HOVER EFFECTS ======
    const teamMembers = document.querySelectorAll('.team-member');
    
    teamMembers.forEach(member => {
        member.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
            this.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.15)';
        });
        
        member.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.08)';
        });
    });
    
    // ====== FEATURE CARDS ANIMATION ======
    const featureCards = document.querySelectorAll('.feature-card');
    
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const featureObserver = new IntersectionObserver(function(entries) {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, observerOptions);
    
    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease';
        featureObserver.observe(card);
    });
    
    // ====== STATS COUNTER ANIMATION ======
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumber = entry.target;
                const targetValue = parseInt(statNumber.textContent);
                const suffix = statNumber.textContent.includes('+') ? '+' : '';
                const cleanValue = parseInt(statNumber.textContent.replace('+', ''));
                
                let currentValue = 0;
                const increment = Math.ceil(cleanValue / 50);
                const timer = setInterval(() => {
                    currentValue += increment;
                    if (currentValue >= cleanValue) {
                        currentValue = cleanValue;
                        clearInterval(timer);
                    }
                    statNumber.textContent = currentValue + suffix;
                }, 30);
                
                statsObserver.unobserve(statNumber);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => {
        statsObserver.observe(stat);
    });
    
    // ====== VIDEO BACKGROUND CONTROLS ======
    const heroVideo = document.getElementById('heroVideo');
    
    if (heroVideo) {
        // Ensure video plays correctly
        heroVideo.play().catch(error => {
            console.log('Video autoplay prevented:', error);
            // Show play button if autoplay fails
            const playButton = document.createElement('button');
            playButton.className = 'video-play-btn';
            playButton.innerHTML = '<i class="fas fa-play"></i> Play Background Video';
            playButton.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 20px;
                background: rgba(0,0,0,0.7);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                z-index: 10;
            `;
            
            playButton.addEventListener('click', function() {
                heroVideo.play();
                this.style.display = 'none';
            });
            
            document.querySelector('.video-container').appendChild(playButton);
        });
        
        // Pause video when not in viewport to save resources
        const videoObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    heroVideo.play();
                } else {
                    heroVideo.pause();
                }
            });
        }, { threshold: 0.3 });
        
        videoObserver.observe(heroVideo);
    }
    
    // ====== SCROLL INDICATOR HIDE ON SCROLL ======
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    if (scrollIndicator) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                scrollIndicator.style.opacity = '0';
                scrollIndicator.style.visibility = 'hidden';
            } else {
                scrollIndicator.style.opacity = '1';
                scrollIndicator.style.visibility = 'visible';
            }
        });
    }
    
    // ====== CTA BUTTON PULSE EFFECT ======
    const ctaButtons = document.querySelectorAll('.btn-cta.primary');
    
    ctaButtons.forEach(button => {
        setInterval(() => {
            button.style.boxShadow = '0 0 0 0 rgba(255, 255, 255, 0.7)';
            setTimeout(() => {
                button.style.boxShadow = '0 0 0 10px rgba(255, 255, 255, 0)';
            }, 300);
        }, 2000);
    });
    
    // ====== FORM SUBMISSION HANDLER (FOR FUTURE) ======
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get all form inputs
            const inputs = this.querySelectorAll('input, textarea, select');
            let isValid = true;
            
            // Simple validation
            inputs.forEach(input => {
                if (input.hasAttribute('required') && !input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#ff6b6b';
                    
                    setTimeout(() => {
                        input.style.borderColor = '';
                    }, 2000);
                }
            });
            
            if (isValid) {
                // Show success message
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
                submitBtn.disabled = true;
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 3000);
            }
        });
    });
    
    // ====== ADD CSS FOR TYPING ANIMATION ======
    const style = document.createElement('style');
    style.textContent = `
        .typing-dots {
            display: flex;
            gap: 4px;
        }
        
        .typing-dots span {
            width: 8px;
            height: 8px;
            background: #667eea;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dots span:nth-child(1) {
            animation-delay: -0.32s;
        }
        
        .typing-dots span:nth-child(2) {
            animation-delay: -0.16s;
        }
        
        @keyframes typing {
            0%, 80%, 100% {
                transform: scale(0.6);
                opacity: 0.5;
            }
            40% {
                transform: scale(1);
                opacity: 1;
            }
        }
        
        .btn-hero.loading {
            opacity: 0.8;
            cursor: not-allowed;
        }
        
        .loading-spinner {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // ====== KEYBOARD SHORTCUTS ======
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + S to go to shopping
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            window.location.href = 'index.html';
        }
        
        // Ctrl/Cmd + B to go to business account
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            window.location.href = 'index.html#supplierOverlay';
        }
        
        // Escape to close mobile menu
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });
    
    // ====== LOADING ANIMATION ======
    window.addEventListener('load', function() {
        // Remove preloader if exists
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }
        
        // Add loaded class to body for animations
        document.body.classList.add('loaded');
    });
    
    // ====== CONSOLE GREETING ======
    console.log(`
    🚀 Victory Bazaar Landing Page Initialized!
    ------------------------------------------
    👥 Team Details Updated:
    • CTO Age: 28 years (Professional Developer)
    • Market Manager: Krishna Singh
    ------------------------------------------
    🎯 Features Active:
    • Smooth Scroll Navigation
    • Mobile Responsive Menu
    • Interactive AI Chat Preview
    • Animated Stats Counter
    • Team Member Hover Effects
    ------------------------------------------
    🎮 Shortcuts:
    • Ctrl/Cmd + S → Go to Shopping
    • Ctrl/Cmd + B → Business Account
    • Escape → Close Mobile Menu
    ------------------------------------------
    Made with ❤️ by Victory Bazaar Team
    `);
});

// ====== ADDITIONAL FUNCTIONS ======

// Function to track button clicks
function trackButtonClick(buttonName) {
    console.log(`Button clicked: ${buttonName}`);
    
    // You can add analytics here
    if (typeof gtag !== 'undefined') {
        gtag('event', 'click', {
            'event_category': 'Button',
            'event_label': buttonName
        });
    }
}

// Function to share page
function sharePage() {
    if (navigator.share) {
        navigator.share({
            title: 'Victory Bazaar - AI Conversational E-Commerce',
            text: 'Check out India\'s first AI-powered conversational e-commerce platform!',
            url: window.location.href
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

// Function to detect user's device
function detectDevice() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile-device');
    } else if (isTablet) {
        document.body.classList.add('tablet-device');
    } else {
        document.body.classList.add('desktop-device');
    }
}

// Initialize device detection
detectDevice();

// ====== PERFORMANCE OPTIMIZATION ======

// Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Debounce scroll events
let scrollTimeout;
window.addEventListener('scroll', function() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(function() {
        // Handle scroll-end events here
    }, 100);
});

// ====== BROWSER COMPATIBILITY ======

// Check for modern features
const features = {
    flexbox: CSS.supports('display', 'flex'),
    grid: CSS.supports('display', 'grid'),
    backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
    smoothScroll: 'scrollBehavior' in document.documentElement.style
};

if (!features.grid) {
    document.body.classList.add('no-css-grid');
}

if (!features.backdropFilter) {
    // Fallback for backdrop-filter
    document.querySelectorAll('.hero-badge, .stat-card, .btn-hero.secondary').forEach(el => {
        el.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
}