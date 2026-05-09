"use strict";

const els = {
  gtfsStatus: document.querySelector("#gtfsStatus"),
  refreshBtn: document.querySelector("#refreshBtn"),
  destinationSearch: document.querySelector("#destinationSearch"),
  destinationSearchBtn: document.querySelector("#destinationSearchBtn"),
  tripSelect: document.querySelector("#tripSelect"),
  tripHint: document.querySelector("#tripHint"),
  languageSelect: document.querySelector("#languageSelect"),
  autoAnnounce: document.querySelector("#autoAnnounce"),
  enableSoundBtn: document.querySelector("#enableSoundBtn"),
  welcomeBtn: document.querySelector("#welcomeBtn"),
  arrivingBtn: document.querySelector("#arrivingBtn"),
  arrivedBtn: document.querySelector("#arrivedBtn"),
  audioStatus: document.querySelector("#audioStatus"),
  installBtn: document.querySelector("#installBtn"),
  pwaStatus: document.querySelector("#pwaStatus"),
  serviceCode: document.querySelector("#serviceCode"),
  clock: document.querySelector("#clock"),
  destinationName: document.querySelector("#destinationName"),
  liveChip: document.querySelector("#liveChip"),
  phaseLabel: document.querySelector("#phaseLabel"),
  nextStation: document.querySelector("#nextStation"),
  arrivalCountdown: document.querySelector("#arrivalCountdown"),
  scheduledTime: document.querySelector("#scheduledTime"),
  platformText: document.querySelector("#platformText"),
  progressFill: document.querySelector("#progressFill"),
  stopList: document.querySelector("#stopList"),
  sectionText: document.querySelector("#sectionText"),
  statusText: document.querySelector("#statusText"),
  journeyProgress: document.querySelector("#journeyProgress"),
  tickerText: document.querySelector("#tickerText"),
  trainDisplay: document.querySelector(".train-display")
};

const GTFS_SRC = "gtfs.zip";
const GONG_SRC = "pkp-intercity-gong.ogg";
const DEFAULT_DWELL_SECONDS = 45;

const state = {
  datasetName: "Sample POLREGIO",
  trips: [],
  selectableTrips: [],
  selectedTripId: "",
  selectedTrip: null,
  destinationQuery: "",
  currentSnapshot: null,
  audioEnabled: false,
  deferredInstallPrompt: null,
  announcementMarks: new Set(),
  lastRenderedStopKey: "",
  gong: new Audio(GONG_SRC)
};

state.gong.preload = "auto";
state.gong.volume = 0.6;

const ANNOUNCEMENT_LANGUAGE_ORDER = {
  en: ["en"],
  pl: ["pl"],
  "pl-en": ["pl", "en"],
  "en-pl": ["en", "pl"],
  de: ["de"],
  cs: ["cs"],
  sk: ["sk"],
  uk: ["uk"],
  fr: ["fr"],
  es: ["es"],
  it: ["it"],
  nl: ["nl"],
  pt: ["pt"],
  sv: ["sv"],
  all: ["pl", "en", "de", "cs", "sk", "uk", "fr", "es", "it", "nl", "pt", "sv"]
};

const ANNOUNCEMENT_LOCALES = {
  en: {
    lang: "en-GB",
    and: "and",
    welcome: ({ destination, operatorName }) => `Welcome onboard this ${operatorName} service to: ${destination}.`,
    arriving: ({ next }) => `We will shortly be arriving at ${next.name}. Please mind the gap between the train and the platform.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `This station is: ${current.name}. This train terminates here. All change please! Thank you for travelling with us!`
      : `This station is: ${current.name}. This train is for: ${destination}. The next station will be: ${afterCurrent[0] || destination}.`
  },
  pl: {
    lang: "pl-PL",
    and: "oraz",
    welcome: ({ destination, operatorName }) => `Witamy w pociagu ${operatorName} do stacji: ${destination}.`,
    arriving: ({ next }) => `Wkrotce przyjedziemy do stacji ${next.name}. Prosimy zachowac ostroznosc przy wysiadaniu.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Stacja: ${current.name}. Pociag konczy bieg. Prosze opuscic pociag. Dziekujemy za wspolna podroz!`
      : `Stacja: ${current.name}. Pociag jedzie do stacji: ${destination}. Nastepna stacja bedzie: ${afterCurrent[0] || destination}.`
  },
  de: {
    lang: "de-DE",
    and: "und",
    welcome: ({ destination, operatorName }) => `Willkommen an Bord dieses ${operatorName}-Zuges nach: ${destination}.`,
    arriving: ({ next }) => `Wir erreichen in Kuerze ${next.name}. Bitte achten Sie auf den Abstand zwischen Zug und Bahnsteig.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Diese Station ist: ${current.name}. Dieser Zug endet hier. Bitte alle aussteigen. Vielen Dank fuer Ihre Reise!`
      : `Diese Station ist: ${current.name}. Dieser Zug faehrt nach: ${destination}. Der naechste Halt wird sein: ${afterCurrent[0] || destination}.`
  },
  cs: {
    lang: "cs-CZ",
    and: "a",
    welcome: ({ destination, operatorName }) => `Vitejte ve vlaku ${operatorName} do stanice: ${destination}.`,
    arriving: ({ next }) => `Za chvili prijedeme do stanice ${next.name}. Dbejte prosim opatrnosti pri vystupovani.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Tato stanice je: ${current.name}. Vlak zde konci. Prosim vystupte. Dekujeme za cestu s nami!`
      : `Tato stanice je: ${current.name}. Vlak jede do stanice: ${destination}. Pristi stanice bude: ${afterCurrent[0] || destination}.`
  },
  sk: {
    lang: "sk-SK",
    and: "a",
    welcome: ({ destination, operatorName }) => `Vitajte vo vlaku ${operatorName} do stanice: ${destination}.`,
    arriving: ({ next }) => `O chvilu prideme do stanice ${next.name}. Pri vystupovani budte prosim opatrni.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Tato stanica je: ${current.name}. Vlak tu konci. Prosim vystupte. Dakujeme za cestu s nami!`
      : `Tato stanica je: ${current.name}. Vlak ide do stanice: ${destination}. Nasledujuca stanica bude: ${afterCurrent[0] || destination}.`
  },
  uk: {
    lang: "uk-UA",
    and: "and",
    welcome: ({ destination, operatorName }) => `Welcome onboard this ${operatorName} service to: ${destination}.`,
    arriving: ({ next }) => `We will shortly arrive at ${next.name}. Please take care when leaving the train.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `This station is: ${current.name}. This train terminates here. All change please! Thank you for travelling with us!`
      : `This station is: ${current.name}. This train is for: ${destination}. The next station will be: ${afterCurrent[0] || destination}.`
  },
  fr: {
    lang: "fr-FR",
    and: "et",
    welcome: ({ destination, operatorName }) => `Bienvenue a bord de ce train ${operatorName} a destination de: ${destination}.`,
    arriving: ({ next }) => `Nous arriverons bientot a ${next.name}. Veuillez faire attention en descendant du train.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Cette gare est: ${current.name}. Ce train est termine ici. Veuillez descendre. Merci d'avoir voyage avec nous!`
      : `Cette gare est: ${current.name}. Ce train est a destination de: ${destination}. La prochaine gare sera: ${afterCurrent[0] || destination}.`
  },
  es: {
    lang: "es-ES",
    and: "y",
    welcome: ({ destination, operatorName }) => `Bienvenidos a bordo de este servicio ${operatorName} con destino a: ${destination}.`,
    arriving: ({ next }) => `En breve llegaremos a ${next.name}. Tengan cuidado al bajar del tren.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Esta estacion es: ${current.name}. Este tren termina aqui. Por favor, bajen del tren. Gracias por viajar con nosotros!`
      : `Esta estacion es: ${current.name}. Este tren va a: ${destination}. La proxima estacion sera: ${afterCurrent[0] || destination}.`
  },
  it: {
    lang: "it-IT",
    and: "e",
    welcome: ({ destination, operatorName }) => `Benvenuti a bordo di questo treno ${operatorName} per: ${destination}.`,
    arriving: ({ next }) => `Stiamo per arrivare a ${next.name}. Prestare attenzione quando si scende dal treno.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Questa stazione e: ${current.name}. Questo treno termina qui. Si prega di scendere. Grazie per aver viaggiato con noi!`
      : `Questa stazione e: ${current.name}. Questo treno e diretto a: ${destination}. La prossima stazione sara: ${afterCurrent[0] || destination}.`
  },
  nl: {
    lang: "nl-NL",
    and: "en",
    welcome: ({ destination, operatorName }) => `Welkom aan boord van deze ${operatorName}-trein naar: ${destination}.`,
    arriving: ({ next }) => `Wij komen zo aan in ${next.name}. Let op bij het uitstappen.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Dit station is: ${current.name}. Deze trein eindigt hier. Iedereen uitstappen alstublieft. Bedankt voor het reizen met ons!`
      : `Dit station is: ${current.name}. Deze trein rijdt naar: ${destination}. Het volgende station wordt: ${afterCurrent[0] || destination}.`
  },
  pt: {
    lang: "pt-PT",
    and: "e",
    welcome: ({ destination, operatorName }) => `Bem-vindos a bordo deste servico ${operatorName} para: ${destination}.`,
    arriving: ({ next }) => `Dentro de momentos chegaremos a ${next.name}. Tenha cuidado ao sair do comboio.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Esta estacao e: ${current.name}. Este comboio termina aqui. Todos devem sair, por favor. Obrigado por viajar connosco!`
      : `Esta estacao e: ${current.name}. Este comboio segue para: ${destination}. A proxima estacao sera: ${afterCurrent[0] || destination}.`
  },
  sv: {
    lang: "sv-SE",
    and: "och",
    welcome: ({ destination, operatorName }) => `Valkommen ombord pa detta ${operatorName}-tag till: ${destination}.`,
    arriving: ({ next }) => `Vi ankommer snart till ${next.name}. Var forsiktig nar du stiger av taget.`,
    arrived: ({ current, destination, afterCurrent, isTerminus }) => isTerminus
      ? `Denna station ar: ${current.name}. Taget slutar har. Alla stiger av, tack. Tack for att du reser med oss!`
      : `Denna station ar: ${current.name}. Taget gar till: ${destination}. Nasta station blir: ${afterCurrent[0] || destination}.`
  }
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatClock(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function secondsNowForGtfs(date = new Date()) {
  let seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  if (seconds < 3 * 3600) seconds += 24 * 3600;
  return seconds;
}

function gtfsDate(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function weekdayKey(date = new Date()) {
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
}

function parseGtfsTime(value) {
  if (!value) return null;
  const parts = value.trim().split(":").map(Number);
  if (parts.length < 2 || parts.some(Number.isNaN)) return null;
  return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
}

function formatGtfsTime(seconds) {
  if (!Number.isFinite(seconds)) return "--:--";
  const wrapped = ((Math.floor(seconds) % 86400) + 86400) % 86400;
  return `${pad(Math.floor(wrapped / 3600))}:${pad(Math.floor((wrapped % 3600) / 60))}`;
}

function minutesText(seconds) {
  if (!Number.isFinite(seconds)) return "time unavailable";
  if (seconds <= 0) return "now";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes === 1 ? "1 min" : `${minutes} min`;
}

function readableList(items) {
  return localizedList(items, "and");
}

function localizedList(items, conjunction) {
  const clean = items.filter(Boolean);
  if (clean.length <= 1) return clean[0] || "";
  if (clean.length === 2) return `${clean[0]} ${conjunction} ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} ${conjunction} ${clean[clean.length - 1]}`;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function trainSearchText(trip) {
  return normalizeSearchText([
    trip.destination?.name,
    trip.headsign,
    trip.route?.short_name,
    trip.route?.long_name,
    trip.route?.operator
  ].filter(Boolean).join(" "));
}

function currentTrainOptions() {
  const options = state.selectableTrips.length ? state.selectableTrips : state.trips;
  const query = normalizeSearchText(state.destinationQuery);
  if (!query) return options;
  return options.filter((trip) => trainSearchText(trip).includes(query));
}

function csvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quote = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quote) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quote = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quote = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      if (row.some((item) => item.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  if (row.some((item) => item.trim() !== "")) rows.push(row);

  const headers = rows.shift()?.map((item) => item.trim()) || [];
  return rows.map((cells) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = (cells[index] || "").trim();
    });
    return entry;
  });
}

function findZipFile(zip, name) {
  const direct = zip.file(name);
  if (direct) return direct;
  const lower = name.toLowerCase();
  const match = Object.keys(zip.files).find((fileName) => fileName.toLowerCase().endsWith(`/${lower}`) || fileName.toLowerCase() === lower);
  return match ? zip.file(match) : null;
}

async function readGtfsCsv(zip, name, required = false) {
  const file = findZipFile(zip, name);
  if (!file) {
    if (required) throw new Error(`Missing required GTFS file: ${name}`);
    return [];
  }
  return csvRows(await file.async("string"));
}

function buildServiceSet(calendar, calendarDates, date = new Date()) {
  const today = gtfsDate(date);
  const weekday = weekdayKey(date);
  const serviceIds = new Set();

  for (const row of calendar) {
    const inDateRange = (!row.start_date || row.start_date <= today) && (!row.end_date || row.end_date >= today);
    if (inDateRange && row[weekday] === "1") serviceIds.add(row.service_id);
  }

  for (const row of calendarDates) {
    if (row.date !== today) continue;
    if (row.exception_type === "1") serviceIds.add(row.service_id);
    if (row.exception_type === "2") serviceIds.delete(row.service_id);
  }

  if (!calendar.length && !calendarDates.length) return null;
  return serviceIds;
}

function tripLabel(trip) {
  const routeName = trip.route.short_name || trip.route.long_name || "POLREGIO";
  const headsign = trip.headsign || trip.destination.name;
  return `Driving now | ${routeName} to ${headsign} | ${formatGtfsTime(trip.startSec)}-${formatGtfsTime(trip.endSec)}`;
}

function normalizeTrip(trip, route, stopTimes, stopsById, agenciesById, defaultAgency) {
  const orderedStops = stopTimes
    .filter((row) => row.trip_id === trip.trip_id)
    .sort((a, b) => Number(a.stop_sequence || 0) - Number(b.stop_sequence || 0))
    .map((row, index) => {
      const stop = stopsById.get(row.stop_id) || {};
      const arrival = parseGtfsTime(row.arrival_time || row.departure_time);
      const departure = parseGtfsTime(row.departure_time || row.arrival_time);
      return {
        id: row.stop_id || `${trip.trip_id}-${index}`,
        name: stop.stop_name || row.stop_id || `Stop ${index + 1}`,
        code: stop.stop_code || "",
        platform: row.stop_headsign || row.platform_code || stop.platform_code || "",
        arrivalSec: arrival,
        departureSec: Math.max(departure ?? arrival ?? 0, arrival ?? departure ?? 0),
        sequence: Number(row.stop_sequence || index)
      };
    })
    .filter((stop) => Number.isFinite(stop.arrivalSec) || Number.isFinite(stop.departureSec));

  if (orderedStops.length < 2) return null;

  for (let index = 0; index < orderedStops.length; index += 1) {
    const stop = orderedStops[index];
    if (!Number.isFinite(stop.arrivalSec)) stop.arrivalSec = stop.departureSec;
    if (!Number.isFinite(stop.departureSec)) stop.departureSec = stop.arrivalSec;
    if (stop.departureSec < stop.arrivalSec) stop.departureSec = stop.arrivalSec;
  }

  const startSec = orderedStops[0].departureSec;
  const endSec = orderedStops[orderedStops.length - 1].arrivalSec;
  const destination = orderedStops[orderedStops.length - 1];
  const agency = route?.agency_id ? agenciesById.get(route.agency_id) : defaultAgency;
  const operatorName = agency?.agency_name || route?.agency_name || "POLREGIO";

  return {
    id: trip.trip_id,
    route: {
      id: route?.route_id || trip.route_id,
      short_name: route?.route_short_name || route?.route_long_name || "R",
      long_name: route?.route_long_name || "",
      operator: operatorName,
      color: route?.route_color ? `#${route.route_color.replace("#", "")}` : ""
    },
    serviceId: trip.service_id,
    headsign: trip.trip_headsign || destination.name,
    stops: orderedStops,
    destination,
    startSec,
    endSec,
    isSample: false,
    isActive: false
  };
}

async function parseGtfsZip(file) {
  if (!window.JSZip) throw new Error("JSZip did not load. Check jszip.min.js.");

  const zip = await JSZip.loadAsync(file);
  const [stops, routes, trips, stopTimes, calendar, calendarDates, agencies] = await Promise.all([
    readGtfsCsv(zip, "stops.txt", true),
    readGtfsCsv(zip, "routes.txt", true),
    readGtfsCsv(zip, "trips.txt", true),
    readGtfsCsv(zip, "stop_times.txt", true),
    readGtfsCsv(zip, "calendar.txt"),
    readGtfsCsv(zip, "calendar_dates.txt"),
    readGtfsCsv(zip, "agency.txt")
  ]);

  const serviceSet = buildServiceSet(calendar, calendarDates);
  const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));
  const routesById = new Map(routes.map((route) => [route.route_id, route]));
  const agenciesById = new Map(agencies.map((agency) => [agency.agency_id || "__default", agency]));
  const defaultAgency = agencies[0] || null;
  const stopTimesByTrip = new Map();

  for (const row of stopTimes) {
    if (!stopTimesByTrip.has(row.trip_id)) stopTimesByTrip.set(row.trip_id, []);
    stopTimesByTrip.get(row.trip_id).push(row);
  }

  const normalizedTrips = [];
  for (const trip of trips) {
    if (serviceSet && !serviceSet.has(trip.service_id)) continue;
    const normalized = normalizeTrip(trip, routesById.get(trip.route_id), stopTimesByTrip.get(trip.trip_id) || [], stopsById, agenciesById, defaultAgency);
    if (normalized) normalizedTrips.push(normalized);
  }

  normalizedTrips.sort((a, b) => a.startSec - b.startSec);
  return normalizedTrips;
}

function createSampleTrip(id, routeName, startOffsetMinutes, stopNames, headsign) {
  const now = secondsNowForGtfs();
  const startSec = now + startOffsetMinutes * 60;
  const stops = stopNames.map((name, index) => {
    const base = startSec + index * 9 * 60 + Math.max(0, index - 1) * 90;
    return {
      id: `${id}-${index}`,
      name,
      code: "",
      platform: index % 2 === 0 ? "2" : "1",
      arrivalSec: index === 0 ? base : base - 35,
      departureSec: index === stopNames.length - 1 ? base - 35 : base + DEFAULT_DWELL_SECONDS,
      sequence: index + 1
    };
  });

  return {
    id,
    route: {
      id: routeName,
      short_name: routeName,
      long_name: "POLREGIO regional service",
      operator: "POLREGIO",
      color: "#00a651"
    },
    serviceId: "sample",
    headsign,
    stops,
    destination: stops[stops.length - 1],
    startSec: stops[0].departureSec,
    endSec: stops[stops.length - 1].arrivalSec,
    isSample: true,
    isActive: false
  };
}

function sampleTrips() {
  return [
    createSampleTrip("sample-r-64200", "R 64200", -12, [
      "Wrocław Główny",
      "Wrocław Brochów",
      "Oława",
      "Brzeg",
      "Lewin Brzeski",
      "Opole Zachodnie",
      "Opole Główne"
    ], "Opole Główne"),
    createSampleTrip("sample-r-30518", "R 30518", -28, [
      "Kraków Główny",
      "Kraków Płaszów",
      "Bochnia",
      "Brzesko Okocim",
      "Tarnów"
    ], "Tarnów"),
    createSampleTrip("sample-r-77631", "R 77631", 18, [
      "Poznań Główny",
      "Poznań Garbary",
      "Czerwonak",
      "Owińska",
      "Gniezno"
    ], "Gniezno")
  ];
}

function classifyTrips(trips) {
  const now = secondsNowForGtfs();
  const active = [];
  const waiting = [];
  const completed = [];

  for (const trip of trips) {
    trip.isWaiting = now < trip.startSec;
    trip.isActive = now >= trip.startSec && now <= trip.endSec + 120;
    trip.isCompleted = now > trip.endSec + 120;

    if (trip.isActive) active.push(trip);
    else if (trip.isWaiting) waiting.push(trip);
    else completed.push(trip);
  }

  active.sort((a, b) => a.endSec - b.endSec);
  waiting.sort((a, b) => a.startSec - b.startSec);
  completed.sort((a, b) => b.endSec - a.endSec);
  return [...active, ...waiting, ...completed];
}

function loadTrips(trips, datasetName, status) {
  state.datasetName = datasetName;
  state.trips = trips;
  state.selectableTrips = classifyTrips(trips);
  state.selectedTripId = state.selectableTrips[0]?.id || trips[0]?.id || "";
  state.destinationQuery = "";
  els.destinationSearch.value = "";
  state.announcementMarks.clear();
  renderTripOptions();
  selectTrip(state.selectedTripId);
  els.gtfsStatus.textContent = status;
}

function renderTripOptions() {
  els.tripSelect.innerHTML = "";
  const options = currentTrainOptions();

  if (!options.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No destination match";
    option.disabled = true;
    els.tripSelect.append(option);
    els.tripHint.textContent = `No train found for destination "${state.destinationQuery}".`;
    return;
  }

  for (const trip of options) {
    const option = document.createElement("option");
    option.value = trip.id;
    option.textContent = tripLabel(trip);
    els.tripSelect.append(option);
  }

  if (state.selectedTripId && options.some((trip) => trip.id === state.selectedTripId)) {
    els.tripSelect.value = state.selectedTripId;
  }

  els.tripHint.textContent = state.destinationQuery
    ? `${options.length} train${options.length === 1 ? "" : "s"} found for "${state.destinationQuery}". Press Search or Enter to select the first match.`
    : `${state.datasetName}: every train is shown in Driving Now. Trips before departure wait until their first scheduled departure.`;
}

function searchDestination(selectFirst = false) {
  state.destinationQuery = els.destinationSearch.value.trim();
  renderTripOptions();
  const [match] = currentTrainOptions();

  if (!selectFirst) return;

  if (!match) {
    els.tripHint.textContent = `No train found for destination "${state.destinationQuery}".`;
    return;
  }

  selectTrip(match.id);
  els.tripHint.textContent = `Selected ${match.route.short_name || match.route.long_name || "train"} to ${match.destination.name}.`;
}

function selectTrip(tripId) {
  const trip = state.trips.find((item) => item.id === tripId) || state.trips[0];
  if (!trip) return;
  state.selectedTripId = trip.id;
  state.selectedTrip = trip;
  els.tripSelect.value = trip.id;
  state.announcementMarks.clear();
  state.lastRenderedStopKey = "";
  updateDisplay(true);
  if (state.currentSnapshot?.phase !== "waiting") {
    queueAutoAnnouncement("welcome", "manual-select");
  }
}

function snapshotForTrip(trip, now = secondsNowForGtfs()) {
  const stops = trip.stops;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const tripDuration = Math.max(1, trip.endSec - trip.startSec);
  let phase = "waiting";
  let currentIndex = 0;
  let nextIndex = 1;
  let segmentProgress = 0;
  let nextArrivalSec = stops[1]?.arrivalSec ?? trip.endSec;
  let currentDepartureSec = null;
  let status = "Waiting departure";

  if (now < first.departureSec) {
    nextIndex = 0;
    nextArrivalSec = first.departureSec;
  } else if (now >= last.arrivalSec) {
    phase = "terminus";
    currentIndex = stops.length - 1;
    nextIndex = stops.length - 1;
    nextArrivalSec = last.arrivalSec;
    segmentProgress = 1;
    status = "Arrived";
  } else {
    for (let index = 0; index < stops.length - 1; index += 1) {
      const current = stops[index];
      const next = stops[index + 1];
      const departed = current.departureSec;
      const arrived = next.arrivalSec;
      const dwellEnd = next.departureSec || next.arrivalSec + DEFAULT_DWELL_SECONDS;

      if (now >= departed && now < arrived) {
        phase = arrived - now <= 90 ? "arriving" : "enroute";
        currentIndex = index;
        nextIndex = index + 1;
        nextArrivalSec = arrived;
        segmentProgress = (now - departed) / Math.max(1, arrived - departed);
        status = phase === "arriving" ? "Arriving" : "En route";
        break;
      }

      if (now >= arrived && now < dwellEnd) {
        phase = "arrived";
        currentIndex = index + 1;
        nextIndex = Math.min(index + 2, stops.length - 1);
        nextArrivalSec = stops[nextIndex]?.arrivalSec || next.arrivalSec;
        currentDepartureSec = dwellEnd;
        segmentProgress = 1;
        status = nextIndex === currentIndex ? "Arrived" : "At station";
        break;
      }
    }
  }

  const nextStop = stops[nextIndex] || last;
  const currentStop = stops[currentIndex] || first;
  const journeyProgress = Math.max(0, Math.min(1, (now - trip.startSec) / tripDuration));

  return {
    phase,
    status,
    currentIndex,
    nextIndex,
    currentStop,
    nextStop,
    nextArrivalSec,
    currentDepartureSec,
    secondsToNext: nextArrivalSec - now,
    secondsToDeparture: Number.isFinite(currentDepartureSec) ? currentDepartureSec - now : null,
    segmentProgress: Math.max(0, Math.min(1, segmentProgress)),
    journeyProgress
  };
}

function renderStops(trip, snapshot) {
  const key = `${trip.id}:${snapshot.currentIndex}:${snapshot.nextIndex}:${trip.stops.length}`;
  if (key === state.lastRenderedStopKey) return;
  state.lastRenderedStopKey = key;
  els.stopList.innerHTML = "";

  trip.stops.forEach((stop, index) => {
    const item = document.createElement("li");
    if (index < snapshot.currentIndex) item.classList.add("passed");
    if (index === snapshot.currentIndex && ["waiting", "arrived", "terminus"].includes(snapshot.phase)) item.classList.add("current");
    if (index === snapshot.nextIndex && !["waiting", "terminus"].includes(snapshot.phase)) item.classList.add("next");

    const dot = document.createElement("span");
    dot.className = "stop-dot";

    const name = document.createElement("span");
    name.className = "stop-name";
    name.textContent = stop.name;

    const time = document.createElement("span");
    time.className = "stop-time";
    time.textContent = formatGtfsTime(index === 0 ? stop.departureSec : stop.arrivalSec);

    item.append(dot, name, time);
    els.stopList.append(item);
  });
}

function updateDisplay(forceStops = false) {
  const trip = state.selectedTrip;
  if (!trip) return;

  const nowDate = new Date();
  const snapshot = snapshotForTrip(trip);
  state.currentSnapshot = snapshot;

  els.clock.textContent = formatClock(nowDate);
  els.serviceCode.textContent = trip.route.short_name || trip.route.long_name || "POLREGIO";
  els.destinationName.textContent = trip.destination.name;
  els.phaseLabel.textContent = snapshot.phase === "waiting" ? "Departure station" : snapshot.phase === "arrived" ? "This station" : snapshot.phase === "terminus" ? "Terminus" : "Next station";
  els.nextStation.textContent = snapshot.phase === "waiting" ? snapshot.currentStop.name : snapshot.phase === "arrived" || snapshot.phase === "terminus" ? snapshot.currentStop.name : snapshot.nextStop.name;
  els.arrivalCountdown.textContent = snapshot.phase === "waiting"
    ? `Departs in ${minutesText(snapshot.secondsToNext)}`
    : snapshot.phase === "terminus"
    ? "Journey complete"
    : snapshot.phase === "arrived"
      ? "Doors open"
      : `Arrives in ${minutesText(snapshot.secondsToNext)}`;
  els.scheduledTime.textContent = formatGtfsTime(snapshot.phase === "waiting" ? snapshot.currentStop.departureSec : snapshot.phase === "arrived" || snapshot.phase === "terminus" ? snapshot.currentStop.arrivalSec : snapshot.nextStop.arrivalSec);
  els.platformText.textContent = snapshot.nextStop.platform ? `Platform ${snapshot.nextStop.platform}` : "Platform shown by GTFS";
  els.progressFill.style.width = `${Math.round(snapshot.journeyProgress * 100)}%`;
  els.journeyProgress.textContent = `${Math.round(snapshot.journeyProgress * 100)}%`;
  els.statusText.textContent = snapshot.status;
  els.sectionText.textContent = snapshot.phase === "waiting"
    ? `${snapshot.currentStop.name} → ${trip.destination.name}`
    : snapshot.phase === "terminus"
    ? `${trip.stops[0].name} → ${trip.destination.name}`
    : `${snapshot.currentStop.name} → ${snapshot.nextStop.name}`;

  const remainingStops = trip.stops.slice(snapshot.nextIndex).map((stop) => stop.name);
  const stationAfterCurrent = trip.stops[snapshot.currentIndex + 1]?.name || trip.destination.name;
  const operatorName = trip.route.operator || "POLREGIO";
  const ticker = snapshot.phase === "waiting"
    ? `Waiting for scheduled departure at ${formatGtfsTime(snapshot.currentStop.departureSec)} from ${snapshot.currentStop.name}. This train is for: ${trip.destination.name}.`
    : snapshot.phase === "terminus"
    ? `This station is: ${snapshot.currentStop.name}. This train terminates here. All change please! Thank you for travelling with us!`
    : snapshot.phase === "arrived"
      ? `This station is: ${snapshot.currentStop.name}. This train is for: ${trip.destination.name}. The next station will be: ${stationAfterCurrent}.`
      : `Welcome onboard this ${operatorName} service to: ${trip.destination.name}. Calling at ${readableList(remainingStops)}.`;
  els.tickerText.textContent = ticker;

  els.trainDisplay.classList.toggle("waiting", snapshot.phase === "waiting");
  els.trainDisplay.classList.toggle("arriving", snapshot.phase === "arriving");
  els.trainDisplay.classList.toggle("arrived", snapshot.phase === "arrived" || snapshot.phase === "terminus");
  els.liveChip.lastChild.textContent = snapshot.phase === "waiting" ? "Waiting departure" : trip.isSample ? "Sample live" : "Live GTFS";

  if (forceStops) state.lastRenderedStopKey = "";
  renderStops(trip, snapshot);
  maybeAutoAnnounce(snapshot);
}

function announcementText(type) {
  const trip = state.selectedTrip;
  const snapshot = state.currentSnapshot || snapshotForTrip(trip);
  const language = els.languageSelect.value;
  const next = snapshot.nextStop;
  const current = snapshot.currentStop;
  const destination = trip.destination.name;
  const operatorName = trip.route.operator || "POLREGIO";
  const remaining = trip.stops.slice(Math.max(snapshot.nextIndex, 1)).map((stop) => stop.name);
  const afterCurrent = trip.stops.slice(snapshot.currentIndex + 1).map((stop) => stop.name);
  const isTerminus = snapshot.phase === "terminus" || current.id === trip.destination.id;
  const context = { trip, snapshot, next, current, destination, operatorName, remaining, afterCurrent, isTerminus };
  const languageCodes = ANNOUNCEMENT_LANGUAGE_ORDER[language] || ANNOUNCEMENT_LANGUAGE_ORDER.en;

  return languageCodes.map((code) => {
    const locale = ANNOUNCEMENT_LOCALES[code] || ANNOUNCEMENT_LOCALES.en;
    return {
      text: locale[type](context),
      lang: locale.lang
    };
  });
}

function pickVoice(lang) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find((voice) => voice.lang === lang)
    || voices.find((voice) => voice.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()))
    || null;
}

async function playSyntheticGong() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.26;
  master.connect(context.destination);
  const notes = [
    { delay: 0, freq: 784, length: 0.42 },
    { delay: 0.23, freq: 659, length: 0.55 },
    { delay: 0.46, freq: 523, length: 0.78 }
  ];

  notes.forEach((note) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.value = note.freq;
    gain.gain.setValueAtTime(0.0001, context.currentTime + note.delay);
    gain.gain.exponentialRampToValueAtTime(0.55, context.currentTime + note.delay + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + note.delay + note.length);
    osc.connect(gain).connect(master);
    osc.start(context.currentTime + note.delay);
    osc.stop(context.currentTime + note.delay + note.length + 0.05);
  });

  window.setTimeout(() => context.close(), 1600);
}

async function playGong() {
  try {
    state.gong.pause();
    state.gong.currentTime = 0;
    await state.gong.play();
    window.setTimeout(() => {
      state.gong.pause();
      state.gong.currentTime = 0;
    }, 2600);
  } catch (error) {
    await playSyntheticGong();
  }
}

function speakSegments(segments) {
  if (!("speechSynthesis" in window)) {
    els.audioStatus.textContent = "Speech synthesis is not available in this browser.";
    return;
  }

  window.speechSynthesis.cancel();
  segments.forEach((segment) => {
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.lang = segment.lang;
    utterance.voice = pickVoice(segment.lang);
    utterance.rate = 0.92;
    utterance.pitch = 0.95;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  });
}

async function playAnnouncement(type) {
  if (!state.selectedTrip) return;
  state.audioEnabled = true;
  const segments = announcementText(type);
  els.audioStatus.textContent = segments.length === 1
    ? "Playing gong and announcement."
    : `Playing gong and ${segments.length} language announcements.`;
  await playGong();
  window.setTimeout(() => {
    speakSegments(segments);
  }, 1050);
}

function queueAutoAnnouncement(type, keyPart) {
  if (!els.autoAnnounce.checked || !state.audioEnabled) return;
  const key = `${type}:${state.selectedTripId}:${keyPart}`;
  if (state.announcementMarks.has(key)) return;
  state.announcementMarks.add(key);
  playAnnouncement(type);
}

function maybeAutoAnnounce(snapshot) {
  if (!state.selectedTrip) return;
  if (snapshot.phase !== "waiting" && snapshot.currentIndex === 0) queueAutoAnnouncement("welcome", "departure");
  if (snapshot.phase === "arriving") queueAutoAnnouncement("arriving", snapshot.nextStop.id);
  if (snapshot.phase === "arrived") {
    queueAutoAnnouncement("arrived", `${snapshot.currentStop.id}:${snapshot.currentStop.arrivalSec}`);
  }
  if (snapshot.phase === "terminus") {
    queueAutoAnnouncement("arrived", `${snapshot.currentStop.id}:terminus`);
  }
}

async function loadAutomaticGtfsFeed() {
  try {
    els.gtfsStatus.textContent = `Loading ${GTFS_SRC}...`;
    const response = await fetch(GTFS_SRC, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${GTFS_SRC} (${response.status}).`);
    const trips = await parseGtfsZip(await response.arrayBuffer());
    if (!trips.length) throw new Error("No usable trips found for today in the GTFS feed.");
    loadTrips(trips, GTFS_SRC, `${GTFS_SRC}: ${trips.length.toLocaleString()} trips loaded for today.`);
  } catch (error) {
    loadTrips(sampleTrips(), "Sample POLREGIO", `${error.message} Sample service loaded so the screen still works.`);
  }
}

function refreshLiveTrips() {
  if (!state.trips.length) return;
  state.selectableTrips = classifyTrips(state.trips);
  renderTripOptions();
  const stillSelectable = state.selectableTrips.some((trip) => trip.id === state.selectedTripId);
  if (!stillSelectable && state.selectableTrips[0]) selectTrip(state.selectableTrips[0].id);
  els.gtfsStatus.textContent = `${state.datasetName}: live trip list refreshed at ${formatClock()}.`;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    els.pwaStatus.textContent = "Service workers are not available in this browser.";
    return;
  }

  if (!["http:", "https:"].includes(window.location.protocol)) {
    els.pwaStatus.textContent = "Open from GitHub Pages, HTTPS, or localhost to enable PWA mode.";
    return;
  }

  navigator.serviceWorker.register("service-worker.js")
    .then(() => {
      els.pwaStatus.textContent = "PWA cache is ready for this static site.";
    })
    .catch(() => {
      els.pwaStatus.textContent = "PWA registration failed. Refresh the static site and try again.";
    });
}

function bindEvents() {
  els.refreshBtn.addEventListener("click", loadAutomaticGtfsFeed);
  els.destinationSearch.addEventListener("input", () => searchDestination(false));
  els.destinationSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    searchDestination(true);
  });
  els.destinationSearchBtn.addEventListener("click", () => searchDestination(true));
  els.tripSelect.addEventListener("change", (event) => selectTrip(event.target.value));
  els.enableSoundBtn.addEventListener("click", async () => {
    state.audioEnabled = true;
    els.audioStatus.textContent = "Sound enabled. Auto announcements can now play.";
    await playGong();
  });
  els.welcomeBtn.addEventListener("click", () => playAnnouncement("welcome"));
  els.arrivingBtn.addEventListener("click", () => playAnnouncement("arriving"));
  els.arrivedBtn.addEventListener("click", () => playAnnouncement("arrived"));
  els.installBtn.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    els.installBtn.disabled = true;
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installBtn.disabled = false;
    els.pwaStatus.textContent = "Install is available for this app.";
  });

  window.speechSynthesis?.addEventListener?.("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

function boot() {
  bindEvents();
  registerServiceWorker();
  loadAutomaticGtfsFeed();
  window.setInterval(() => {
    updateDisplay();
    if (new Date().getSeconds() === 0) refreshLiveTrips();
  }, 1000);
}

boot();
