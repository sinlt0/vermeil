// ============================================================
//  main.js — Global client-side logic
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // ── Mobile Menu Toggle ────────────────────────────────
  const menuToggle = document.querySelector(".mobile-menu-toggle");
  const menuClose  = document.querySelector(".mobile-menu-close");
  const mobileNav  = document.querySelector(".mobile-nav");

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
      mobileNav.classList.add("active");
      document.body.style.overflow = "hidden"; // Prevent scrolling
    });
  }

  if (menuClose && mobileNav) {
    menuClose.addEventListener("click", () => {
      mobileNav.classList.remove("active");
      document.body.style.overflow = ""; // Restore scrolling
    });
  }

  // Close menu on link click
  const mobileLinks = document.querySelectorAll(".mobile-nav-links a");
  mobileLinks.forEach(link => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("active");
      document.body.style.overflow = "";
    });
  });

  // ── Navbar Scroll Effect ─────────────────────────────
  const navbar = document.querySelector(".navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      navbar.style.background = "rgba(13, 17, 23, 0.9)";
      navbar.style.borderBottomColor = "rgba(255, 255, 255, 0.1)";
    } else {
      navbar.style.background = "rgba(13, 17, 23, 0.7)";
      navbar.style.borderBottomColor = "rgba(255, 255, 255, 0.08)";
    }
  });

  // ── Smooth Anchors ───────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });
});
