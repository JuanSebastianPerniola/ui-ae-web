const form = document.querySelector("#availability-form");
const searchButton = document.querySelector("#search-button");
const responseOutput = document.querySelector("#response-output code");
const requestOutput = document.querySelector("#request-output code");
const responseSummary = document.querySelector("#response-summary");
const statusBadge = document.querySelector("#status-badge");
const copyButton = document.querySelector("#copy-button");
const hotelSelect = document.querySelector("#hotel-select");
const embeddedFunctionCode = decodeURIComponent("EQ3srl8rjHDEmCQsX41o_xD47rkNAj6gxxy4OSmDZj7vAzFuTu3xyA%3D%3D");
const apiEndpoints = [
  {
    url: "https://pre-gisapim.iberostar.com/mule/ae/availability/search",
    name: "Availability search (GIS)"
  },
  {
    url: "https://ibhbegprefuncwinsearch.azurewebsites.net/api/availability/search",
    name: "Availability search (not GIS)"
  },
  {
    url: "https://ibhbegprefuncwinsearch.azurewebsites.net/api/price-from",
    name: "Price from (not GIS)"
  }
];
let lastResponseText = "";
let hotels = [];

const apiName = document.querySelector("#api-name");
const apiUrl = document.querySelector("#api-url");
const apiEndpoint = document.querySelector("#api-endpoint");

apiEndpoints.forEach(({ name }) => {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  apiName.append(option);
});

function updateApiEndpoint() {
  const selectedApi = apiEndpoints.find(({ name }) => name === apiName.value);
  if (!selectedApi) {
    apiEndpoint.value = "";
    apiUrl.textContent = "No API selected";
    return;
  }
  apiEndpoint.value = selectedApi.url;
  apiUrl.textContent = selectedApi.url;
}

apiName.addEventListener("change", updateApiEndpoint);
updateApiEndpoint();

async function loadHotels() {
  try {
    const response = await fetch("hotel_list/hotel_list.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const destinations = await response.json();
    hotels = destinations.flatMap(({ destino, hoteles: destinationHotels }) => (
      destinationHotels.map((hotel) => ({ ...hotel, destino }))
    ));

    hotelSelect.replaceChildren(new Option("Select a hotel", ""));
    const hotelsByDestination = new Map();
    hotels.forEach((hotel, index) => {
      if (!hotelsByDestination.has(hotel.destino)) {
        hotelsByDestination.set(hotel.destino, document.createElement("optgroup"));
        hotelsByDestination.get(hotel.destino).label = hotel.destino;
        hotelSelect.append(hotelsByDestination.get(hotel.destino));
      }
      const option = new Option(
        `${hotel.nombre}${hotel.categoria ? ` (${hotel.categoria})` : ""} - ${hotel.codigo}`,
        String(index)
      );
      hotelsByDestination.get(hotel.destino).append(option);
    });
    hotelSelect.disabled = false;
  } catch (error) {
    hotelSelect.replaceChildren(new Option("Unable to load hotels", ""));
    setStatus("error", "Hotels unavailable");
    responseSummary.textContent = "The hotel list could not be loaded. Check hotel_list/hotel_list.json.";
    showResponse({ error: `Could not load hotel list: ${error.message}` });
  }
}

function setStatus(state, label) {
  statusBadge.dataset.state = state;
  statusBadge.textContent = label;
}

function getRequestBody() {
  const formData = new FormData(form);
  const hotel = hotels[Number(formData.get("hotelId"))];
  return {
    rooms: [{ adults: formData.get("adults") }],
    channel: "b2c-web",
    hotelId: hotel.id,
    partnerId: null,
    promoCode: formData.get("promoCode") || null,
    arrivalDate: toIsoDate(formData.get("arrivalDate")),
    countryCode: String(formData.get("countryCode")).trim().toUpperCase(),
    departureDate: toIsoDate(formData.get("departureDate")),
    UseCache: true,
    bypassRestrictions: { quota: false, minStay: false, release: false, occupancy: false, salesClose: false, rateRelease: false }
  };
}

loadHotels();

function toIsoDate(value) {
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const [, day, month, shortYear] = match;
  const year = Number(shortYear) >= 70 ? `19${shortYear}` : `20${shortYear}`;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (
    date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() + 1 !== Number(month)
    || date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function toDisplayDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

document.querySelectorAll(".calendar-button").forEach((button) => {
  const picker = document.querySelector(`#${button.dataset.datePicker}`);
  const displayInput = picker.parentElement.querySelector('input[name$="Date"]');

  button.addEventListener("click", () => {
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
    } else {
      picker.focus();
      picker.click();
    }
  });

  picker.addEventListener("change", () => {
    if (picker.value) displayInput.value = toDisplayDate(picker.value);
  });
});

function showResponse(value) {
  lastResponseText = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  responseOutput.textContent = lastResponseText;
  copyButton.disabled = false;
}

function showRequest(value) {
  requestOutput.textContent = JSON.stringify(value, null, 2);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const arrivalDate = formData.get("arrivalDate");
  const departureDate = formData.get("departureDate");
  const endpoint = String(formData.get("apiEndpoint")).trim();
  const arrivalIsoDate = toIsoDate(arrivalDate);
  const departureIsoDate = toIsoDate(departureDate);
  const selectedHotel = hotels[Number(formData.get("hotelId"))];

  if (!arrivalIsoDate || !departureIsoDate) {
    setStatus("error", "Invalid dates");
    responseSummary.textContent = "Dates must use the format dd/MM/yy.";
    showResponse({ error: "Dates must use the format dd/MM/yy." });
    return;
  }

  if (departureIsoDate <= arrivalIsoDate) {
    setStatus("error", "Invalid dates");
    responseSummary.textContent = "Departure date must be after arrival date.";
    showResponse({ error: "Departure date must be after arrival date." });
    return;
  }

  if (!selectedHotel) {
    setStatus("error", "Invalid hotel");
    responseSummary.textContent = "Select a hotel before searching.";
    showResponse({ error: "Select a hotel before searching." });
    return;
  }

  const requestBody = getRequestBody();
  showRequest(requestBody);
  const url = new URL(endpoint);
  if (url.hostname === "ibhbegprefuncwinsearch.azurewebsites.net") {
    url.searchParams.set("code", embeddedFunctionCode);
  }
  setStatus("loading", "Searching...");
  responseSummary.textContent = "Sending request to the availability service...";
  searchButton.disabled = true;
  copyButton.disabled = true;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    const responseText = await response.text();
    let responseValue;
    try { responseValue = JSON.parse(responseText); } catch { responseValue = responseText; }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${typeof responseValue === "string" ? responseValue : JSON.stringify(responseValue)}`);
    }
    showResponse(responseValue);
    setStatus("success", "Success");
    responseSummary.textContent = `Request completed with HTTP ${response.status}.`;
  } catch (error) {
    const message = error instanceof TypeError
      ? "The browser could not reach the API. Check the endpoint and the API CORS configuration."
      : error.message;
    showResponse({ error: message });
    setStatus("error", "Request failed");
    responseSummary.textContent = message;
  } finally {
    searchButton.disabled = false;
  }
});

copyButton.addEventListener("click", async () => {
  if (!lastResponseText) return;
  try {
    await navigator.clipboard.writeText(lastResponseText);
    copyButton.textContent = "Copied";
    window.setTimeout(() => { copyButton.textContent = "Copy JSON"; }, 1500);
  } catch {
    responseSummary.textContent = "Copy failed. Select the response manually.";
  }
});
