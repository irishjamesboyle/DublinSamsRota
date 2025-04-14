// Helper function to group shifts into 30-minute slots and count distinct volunteers
function groupShiftsIntoSlots(shifts) {
  const slots = [];

  shifts.forEach((shift) => {
    const shiftStart = new Date(shift.start_datetime);
    const shiftEnd = new Date(shiftStart.getTime() + shift.duration * 1000);

    // Create 30-minute slots and group volunteers into them
    for (
      let currentSlot = new Date(shiftStart);
      currentSlot < shiftEnd;
      currentSlot.setMinutes(currentSlot.getMinutes() + 30)
    ) {
      const slotStartTime = new Date(currentSlot);
      const slotEndTime = new Date(currentSlot.getTime() + 30 * 60 * 1000);

      // Check if this slot already exists
      let slot = slots.find(
        (s) => s.start.getTime() === slotStartTime.getTime()
      );

      if (!slot) {
        slot = {
          start: slotStartTime,
          end: slotEndTime,
          volunteerIds: new Set(), // Set to track unique volunteer IDs
        };
        slots.push(slot);
      }

      // Loop through the shift's volunteers and add their IDs to the Set
      shift.volunteers.forEach((volunteer) => {
        slot.volunteerIds.add(volunteer.id); // Use volunteer id for uniqueness
      });
    }
  });

  // Convert sets to counts for rendering
  return slots.map((slot) => ({
    start: slot.start,
    end: slot.end,
    volunteerCount: slot.volunteerIds.size, // Count unique volunteers
  }));
}

// Fetch and process rota
async function loadRota() {
  try {
    const response = await fetch('http://localhost:3000/api/rota');
    const data = await response.json();

    if (!data || !Array.isArray(data.shifts)) {
      throw new Error('Rota data malformed or missing.');
    }

    const slots = groupShiftsIntoSlots(data.shifts);
    renderTable(slots);
  } catch (error) {
    console.error('Error loading rota:', error);
    document.getElementById('rota-table-container').innerHTML =
      'Failed to load rota.';
  }
}

// Render table showing count of volunteers in each time slot
function renderTable(slots) {
  const container = document.getElementById('rota-table-container');
  container.innerHTML = '';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // Table header
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `
    <th>Time Slot</th>
    <th>Number of Volunteers</th>
  `;
  thead.appendChild(headerRow);

  // Table rows (with volunteer count only)
  slots.forEach((slot) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${slot.start.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })} - ${slot.end.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}</td>
      <td>${slot.volunteerCount}</td> <!-- This will display the number of volunteers -->
    `;
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
}

// Load rota on page load
loadRota();
