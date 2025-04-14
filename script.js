function parseUtcTimeParts(datetime) {
  // e.g. "2025-04-20T22:00:00.000Z"
  const [datePart, timePart] = datetime.split("T");
  const [hour, minute] = timePart.split(":");
  return {
    date: datePart,
    hour: parseInt(hour, 10),
    minute: parseInt(minute, 10),
  };
}

function groupShiftsIntoSlots(shifts) {
  const slotMap = {};

  shifts.forEach((shift) => {
    const start = parseUtcTimeParts(shift.start_datetime);
    const durationMinutes = shift.duration / 60;

    let slotDate = start.date;
    let slotHour = start.hour;
    let slotMinute = start.minute;

    const totalSlots = Math.ceil(durationMinutes / 30);

    for (let i = 0; i < totalSlots; i++) {
      const hourStr = String(slotHour).padStart(2, "0");
      const minuteStr = String(slotMinute).padStart(2, "0");
      const timeSlot = `${hourStr}:${minuteStr}`;

      if (!slotMap[slotDate]) slotMap[slotDate] = {};
      if (!slotMap[slotDate][timeSlot]) slotMap[slotDate][timeSlot] = [];

      const names = shift.volunteers.map(v => v.name);
      slotMap[slotDate][timeSlot].push(...names);

      // Advance 30 minutes manually
      slotMinute += 30;
      if (slotMinute >= 60) {
        slotMinute = 0;
        slotHour += 1;
        if (slotHour === 24) {
          slotHour = 0;
          // Move to next day
          const nextDate = new Date(`${slotDate}T00:00:00Z`);
          nextDate.setUTCDate(nextDate.getUTCDate() + 1);
          slotDate = nextDate.toISOString().split("T")[0];
        }
      }
    }
  });

  return slotMap;
}

function renderTable(slotMap) {
  const container = document.getElementById("rota-table-container");
  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "rota-table";

  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hours = String(Math.floor(i / 2)).padStart(2, "0");
    const minutes = i % 2 === 0 ? "00" : "30";
    return `${hours}:${minutes}`;
  });

  const days = Object.keys(slotMap).sort();

  // Header row
  const headerRow = document.createElement("tr");
  const timeHeader = document.createElement("th");
  timeHeader.textContent = "Time";
  headerRow.appendChild(timeHeader);

  days.forEach((day) => {
    const th = document.createElement("th");
    th.textContent = day;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Time rows
  timeSlots.forEach((slot) => {
    const row = document.createElement("tr");
    const timeCell = document.createElement("td");
    timeCell.textContent = slot;
    row.appendChild(timeCell);

    days.forEach((day) => {
      const cell = document.createElement("td");
      const names = slotMap[day]?.[slot] || [];
      cell.textContent = names.join(", ");

      if (names.length < 2) {
        cell.style.backgroundColor = "#f8d7da";
      }

      row.appendChild(cell);
    });

    table.appendChild(row);
  });

  container.appendChild(table);
}

async function loadRota() {
  try {
    const response = await fetch("http://localhost:3000/api/rota");
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Rota data is not an array");
    }

    console.log("Raw rota data from API:", data);

    const slotMap = groupShiftsIntoSlots(data);
    renderTable(slotMap);
  } catch (error) {
    console.error("Error in loadRota:", error);
    document.getElementById("rota-table-container").textContent =
      "Failed to load rota.";
  }
}

loadRota();
