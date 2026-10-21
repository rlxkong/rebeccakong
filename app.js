// Shared behavior for the portfolio pages.
const contactForm = document.querySelector("#contact-form");

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.querySelector("#email").value.trim();
    const message = document.querySelector("#message").value.trim();
    const status = document.querySelector("#contact-status");

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      status.textContent = "Please enter a valid email address.";
      return;
    }
    if (!message) {
      status.textContent = "Please write a message.";
      return;
    }

    const subject = encodeURIComponent(`Portfolio message from ${email}`);
    const body = encodeURIComponent(`${message}\n\nReply to: ${email}`);
    window.location.href = `mailto:rebecca.lx.kong@gmail.com?subject=${subject}&body=${body}`;
    status.textContent = "Your email app should open with the message ready to send.";
  });
}
