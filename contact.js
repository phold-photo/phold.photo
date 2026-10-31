// Support page: Contact us. Sends the form to the shop's /contact (it's kept, then passed on to Sentry's Feedback
// list beside the app's messages) and says how it went, without leaving the page. Without JavaScript there's the
// email link beside it.
(() => {
  const form = document.getElementById("contact");
  if (!form) return;
  const opened = Date.now();
  const note = form.querySelector(".note");
  const button = form.querySelector("button[type=submit]");
  const say = (text, sent = false) => { note.textContent = text; note.classList.toggle("sent", sent); };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test((data.email || "").trim())) return say("An email address, so we can answer you.");
    if ((data.message || "").trim().length < 3) return say("A few words about it.");
    button.disabled = true;
    say("Sending…");
    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, page: location.href, elapsed: Date.now() - opened }),
      });
      const reply = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(reply.error || "That didn't send.");
      form.reset();
      say(`Thanks. We'll answer at ${data.email.trim()}, usually within a day or two.`, true);
    } catch (error) {
      say(`${error.message} You can also email eammon@phold.photo.`);
    } finally {
      button.disabled = false;
    }
  });
})();
