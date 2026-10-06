document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const participantLists = new Map();

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      participantLists.clear();

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;
        const availability = activityCard.querySelector(".activity-availability");

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeader = document.createElement("div");
        participantsHeader.className = "participants-header";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participants";

        const participantCount = document.createElement("span");
        participantCount.className = "participant-count";
        participantCount.textContent = details.participants.length;
        participantCount.setAttribute("aria-label", `${details.participants.length} signed up`);

        participantsHeader.append(participantsHeading, participantCount);
        participantsSection.appendChild(participantsHeader);

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";
        details.participants.forEach((email) => {
          participantsList.appendChild(createParticipantItem(name, email));
        });

        if (details.participants.length === 0) {
          const emptyState = document.createElement("li");
          emptyState.className = "empty-state";
          emptyState.textContent = "No participants yet";
          participantsList.appendChild(emptyState);
        }

        participantsSection.appendChild(participantsList);
        activityCard.appendChild(participantsSection);
        participantLists.set(name, {
          list: participantsList,
          count: participantCount,
          availability,
          maxParticipants: details.max_participants,
        });
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        const participants = participantLists.get(activity);
        if (participants) {
          participants.list.querySelector(".empty-state")?.remove();
          participants.list.appendChild(createParticipantItem(activity, email));
          updateParticipantSummary(participants);
        }
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  function createParticipantItem(activity, email) {
    const item = document.createElement("li");
    item.className = "participant-item";

    const participantEmail = document.createElement("span");
    participantEmail.className = "participant-email";
    participantEmail.textContent = email;
    item.appendChild(participantEmail);

    const removeButton = document.createElement("button");
    removeButton.className = "participant-remove";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${email} from ${activity}`);
    removeButton.title = "Unregister participant";

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3");
    icon.appendChild(path);
    removeButton.appendChild(icon);

    removeButton.addEventListener("click", () => unregisterParticipant(activity, email, item, removeButton));
    item.appendChild(removeButton);
    return item;
  }

  async function unregisterParticipant(activity, email, item, button) {
    button.disabled = true;
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        messageDiv.textContent = result.detail || "Unable to unregister participant";
        messageDiv.className = "error";
      } else {
        item.remove();
        const participants = participantLists.get(activity);
        if (participants) {
          if (participants.list.children.length === 0) {
            const emptyState = document.createElement("li");
            emptyState.className = "empty-state";
            emptyState.textContent = "No participants yet";
            participants.list.appendChild(emptyState);
          }
          updateParticipantSummary(participants);
        }
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
      }
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering participant:", error);
    } finally {
      button.disabled = false;
    }
  }

  function updateParticipantSummary(participants) {
    const count = participants.list.querySelectorAll(".participant-item").length;
    participants.count.textContent = count;
    participants.count.setAttribute("aria-label", `${count} signed up`);
    participants.availability.innerHTML =
      `<strong>Availability:</strong> ${participants.maxParticipants - count} spots left`;
  }

  // Initialize app
  fetchActivities();
});
