// =========================
// SWACCHA REPORT SYSTEM
// =========================


// =========================
// PHOTO PREVIEW
// =========================

const issuePhoto = document.getElementById("issuePhoto");
const photoPreview = document.getElementById("photoPreview");

if (issuePhoto) {

    issuePhoto.addEventListener("change", function () {

        photoPreview.innerHTML = "";

        const file = this.files[0];

        if (file) {

            const image = document.createElement("img");

            image.src = URL.createObjectURL(file);

            image.alt = "Issue Photo";

            photoPreview.appendChild(image);
        }

    });

}


// =========================
// GPS LOCATION
// =========================

const locationButton =
    document.getElementById("locationButton");

const locationStatus =
    document.getElementById("locationStatus");

const latitudeInput =
    document.getElementById("latitude");

const longitudeInput =
    document.getElementById("longitude");


function getMyLocation() {

    if (!navigator.geolocation) {

        if (locationStatus) {
            locationStatus.textContent =
                "❌ Geolocation is not supported by this browser.";
        }

        return;
    }

    if (locationStatus) {
        locationStatus.textContent =
            "📍 Getting your location...";
    }

    navigator.geolocation.getCurrentPosition(

        function (position) {

            const lat =
                position.coords.latitude;

            const lon =
                position.coords.longitude;

            if (latitudeInput) {
                latitudeInput.value = lat;
            }

            if (longitudeInput) {
                longitudeInput.value = lon;
            }

            if (locationStatus) {
                locationStatus.textContent =
                    "✅ Location detected successfully.";
            }

            console.log("Latitude:", lat);
            console.log("Longitude:", lon);
        },

        function (error) {

            console.error("GPS Error:", error);

            if (!locationStatus) {
                return;
            }

            if (error.code === 1) {

                locationStatus.textContent =
                    "❌ Location permission denied. Please allow location access.";

            } else if (error.code === 2) {

                locationStatus.textContent =
                    "❌ Location is currently unavailable.";

            } else if (error.code === 3) {

                locationStatus.textContent =
                    "❌ Location request timed out. Try again.";

            } else {

                locationStatus.textContent =
                    "❌ Unable to get your location.";
            }
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}


if (locationButton) {

    locationButton.addEventListener(
        "click",
        getMyLocation
    );

}

// =========================
// SUBMIT REPORT
// =========================

const reportForm =
    document.getElementById("reportForm")


if (reportForm) {

    reportForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        // Generate complaint ID

        const complaintId =
            "SWC-" +
            Date.now().toString().slice(-6);


        // Get form values

        const issueCategory =
            document.getElementById("issueCategory").value;
            let priority = "Medium";

if (issueCategory === "electricity" ||
    issueCategory === "streetlight") {
    priority = "High";
} else if (issueCategory === "garbage" ||
           issueCategory === "drainage") {
    priority = "Medium";
} else {
    priority = "Low";
}
        const department =
            getDepartment(issueCategory);


        const address =
            document.getElementById("address").value;


        const description =
            document.getElementById("description").value;
            const photoInput =
    document.getElementById("issuePhoto");

const photoFile =
    photoInput.files[0];

    let photoData = "";

if (photoFile) {
    photoData = await new Promise(function (resolve) {

        const reader = new FileReader();

        reader.onload = function () {
            resolve(reader.result);
        };

        reader.readAsDataURL(photoFile);
    });
}


        const lat =
            document.getElementById("latitude").value;


        const lon =
            document.getElementById("longitude").value;


        // Create report object

        const savedUser =
    localStorage.getItem("swacchaUser");

const user =
    savedUser ? JSON.parse(savedUser) : null;


const report = {

    id: complaintId,

    category: issueCategory,

    department: department,

    priority: priority,

    address: address,

    description: description,

    photo: photoData,

    latitude: lat,

    longitude: lon,

    date: new Date().toLocaleString(),

    createdAt: new Date().toISOString(),

    status: "Pending",

    userEmail: user
        ? user.email
        : null

};
        // Get existing reports

        let reports =
            JSON.parse(
                localStorage.getItem("swacchaReports")
            ) || [];


        // Add new report

        reports.push(report);


        // Save reports

        localStorage.setItem(
            "swacchaReports",
            JSON.stringify(reports)
        );

        fetch("http://localhost:3000/api/reports", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(report)
})
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        console.log("Backend report saved:", data);
    })
    .catch(function (error) {
        console.error("Backend report save failed:", error);
    });


        // Show success message

        document.getElementById("complaintId")
            .textContent = complaintId;


        document.getElementById("reportSuccess")
            .style.display = "block";


        // Hide form

        reportForm.style.display = "none";


        // Scroll to success message

        window.scrollTo({

            top: document.body.scrollHeight,

            behavior: "smooth"

        });

    });

}


// =========================
// DISPLAY MY REPORTS
// =========================

const reportsList =
    document.getElementById("reportsList");

const noReports =
    document.getElementById("noReports");


function loadMyReports() {

    if (!reportsList) {
        return;
    }

    const savedUser =
        localStorage.getItem("swacchaUser");

    if (!savedUser) {
        window.location.href = "login.html";
        return;
    }

    const loggedInUser =
        JSON.parse(savedUser);


    fetch("http://localhost:3000/api/reports")

        .then(function (response) {

            if (!response.ok) {
                throw new Error(
                    "Failed to load reports"
                );
            }

            return response.json();
        })

        .then(function (reports) {

            console.log("All reports:", reports);
            console.log(
                "Logged-in user:",
                loggedInUser.email
            );


            // Show only reports belonging
            // to the logged-in user

            const myReports =
                reports.filter(function (report) {

                    return String(
                        report.userEmail || ""
                    ).trim().toLowerCase()
                    ===
                    String(
                        loggedInUser.email || ""
                    ).trim().toLowerCase();

                });


            console.log(
                "My reports:",
                myReports
            );


            reportsList.innerHTML = "";


            if (myReports.length === 0) {

                if (noReports) {
                    noReports.style.display =
                        "block";
                }

                return;
            }


            if (noReports) {
                noReports.style.display =
                    "none";
            }


            myReports.forEach(function (report) {

                // Create report card

                const card =
                    document.createElement("div");

                card.className =
                    "report-card";


                // 24-hour target

                const createdTime =
                    new Date(report.createdAt);

                const deadline =
                    new Date(
                        createdTime.getTime() +
                        24 * 60 * 60 * 1000
                    );

                const now =
                    new Date();

                const remainingTime =
                    deadline - now;


                let slaText = "";


                if (
                    report.status ===
                    "Resolved"
                ) {

                    slaText =
                        "✅ Resolved";

                } else if (
                    remainingTime <= 0
                ) {

                    slaText =
                        "⚠️ 24-hour target exceeded";

                } else {

                    const hours =
                        Math.floor(
                            remainingTime /
                            (1000 * 60 * 60)
                        );

                    const minutes =
                        Math.floor(
                            (
                                remainingTime %
                                (1000 * 60 * 60)
                            ) /
                            (1000 * 60)
                        );

                    slaText =
                        "⏱️ " +
                        hours +
                        "h " +
                        minutes +
                        "m remaining";
                }


                // Report card

                card.innerHTML = `

                    <div class="report-card-header">

                        <div>

                            <h2>
                                ${report.category || "Issue"}
                            </h2>

                            <span class="complaint-id">
                                Complaint ID:
                                ${report.id}
                            </span>

                        </div>

                        <span class="status">
                            ${report.status || "Pending"}
                        </span>

                    </div>


                    <div class="sla-status">

                        <strong>
                            ⏰ Response Target
                        </strong>

                        <span>
                            ${slaText}
                        </span>

                    </div>


                    <div class="report-details">

                        <div class="report-detail">

                            <strong>
                                📅 Date
                            </strong>

                            <span>
                                ${report.date || "Not available"}
                            </span>

                        </div>


                        <div class="report-detail">

                            <strong>
                                📍 Address
                            </strong>

                            <span>
                                ${report.address || "Not available"}
                            </span>

                        </div>


                        <div class="report-detail">

                            <strong>
                                🌐 Location
                            </strong>

                            <span>
                                ${report.latitude || "N/A"},
                                ${report.longitude || "N/A"}
                            </span>

                        </div>


                        <div class="report-detail">

                            <strong>
                                📝 Description
                            </strong>

                            <span>
                                ${report.description || "No description"}
                            </span>

                        </div>


                        <div class="report-detail">

                            <strong>
                                🏢 Department
                            </strong>

                            <span>
                                ${report.department || "Not assigned"}
                            </span>

                        </div>


                        <div class="report-detail">

                            <strong>
                                ⚡ Priority
                            </strong>

                            <span>
                                ${report.priority || "Medium"}
                            </span>

                        </div>


                        ${
                            report.photo
                            ? `

                                <div class="report-detail">

                                    <strong>
                                        📷 Complaint Photo
                                    </strong>

                                    <img
                                        src="${report.photo}"
                                        alt="Complaint Photo"
                                        style="
                                            max-width:300px;
                                            width:100%;
                                            margin-top:10px;
                                            border-radius:8px;
                                        "
                                    >

                                </div>

                            `
                            : ""
                        }

                    </div>


                    <div class="report-actions">

                        <button
                            class="track-button"
                            onclick="viewReportDetails('${report.id}')"
                        >
                            🔍 Track Complaint
                        </button>

                    </div>

                `;


                reportsList.appendChild(card);

            });

        })

        .catch(function (error) {

            console.error(
                "Failed to load reports:",
                error
            );

            reportsList.innerHTML = `
                <p>
                    ❌ Unable to load your reports.
                </p>
            `;

        });
}


loadMyReports();
// =========================
// OFFICER DASHBOARD
// =========================

const officerReportsList =
    document.getElementById("officerReportsList");

const noOfficerReports =
    document.getElementById("noOfficerReports");

const totalReports =
    document.getElementById("totalReports");

const pendingReports =
    document.getElementById("pendingReports");

const progressReports =
    document.getElementById("progressReports");

const resolvedReports =
    document.getElementById("resolvedReports");

const refreshReports =
    document.getElementById("refreshReports");


function loadOfficerReports() {
    if (!officerReportsList) {
        return;
    }

    fetch("http://localhost:3000/api/reports")
        .then(function (response) {
            return response.json();
        })
        .then(function (reports) {

            officerReportsList.innerHTML = "";

            totalReports.textContent = reports.length;

            pendingReports.textContent =
                reports.filter(function (report) {
                    return report.status === "Pending";
                }).length;

            progressReports.textContent =
                reports.filter(function (report) {
                    return report.status === "In Progress";
                }).length;

            resolvedReports.textContent =
                reports.filter(function (report) {
                    return report.status === "Resolved";
                }).length;

            if (reports.length === 0) {
                noOfficerReports.style.display = "block";
                return;
            }

            noOfficerReports.style.display = "none";

            reports.forEach(function (report, index) {

                const createdTime =
                    new Date(report.createdAt);

                const deadline =
                    new Date(
                        createdTime.getTime() +
                        24 * 60 * 60 * 1000
                    );

                const now = new Date();

                const remainingTime =
                    deadline - now;

                let officerSlaText = "";

                if (report.status === "Resolved") {

                    officerSlaText = "✅ Resolved";

                } else if (remainingTime <= 0) {

                    officerSlaText =
                        "⚠️ 24-hour target exceeded";

                } else {

                    const hours =
                        Math.floor(
                            remainingTime /
                            (1000 * 60 * 60)
                        );

                    const minutes =
                        Math.floor(
                            (remainingTime %
                            (1000 * 60 * 60)) /
                            (1000 * 60)
                        );

                    officerSlaText =
                        `⏱️ ${hours}h ${minutes}m remaining`;
                }

                const card =
                    document.createElement("div");

                card.className =
                    "officer-report-card";

                card.innerHTML = `
                    <div class="officer-report-header">

                        <div>
                            <h3>${report.category}</h3>

                            <span class="officer-report-id">
                                Complaint ID: ${report.id}
                            </span>
                        </div>

                        <span class="status ${
                            report.status === "Resolved"
                                ? "status-resolved"
                                : report.status === "In Progress"
                                ? "status-progress"
                                : "status-pending"
                        }">
                            ${report.status}
                        </span>

                    </div>

                    <div class="officer-sla">

                        <strong>
                            ⏰ Response Target
                        </strong>

                        <span>
                            ${officerSlaText}
                        </span>

                    </div>

                    <div class="officer-report-info">

                        <div class="officer-info-box">
                            <strong>⚡ Priority</strong>
                            <span>
                                ${report.priority || "Medium"}
                            </span>
                        </div>

                        <div class="officer-info-box">
                            <strong>📅 Date</strong>
                            <span>
                                ${report.date}
                            </span>
                        </div>

                        <div class="officer-info-box">
                            <strong>📍 Address</strong>
                            <span>
                                ${report.address}
                            </span>
                        </div>

                        <div class="officer-info-box">
                            <strong>🌐 Latitude</strong>
                            <span>
                                ${report.latitude || "Not available"}
                            </span>
                        </div>

                        <div class="officer-info-box">
                            <strong>🌐 Longitude</strong>
                            <span>
                                ${report.longitude || "Not available"}
                            </span>
                        </div>

                    </div>

                    <div class="officer-info-box">

                        <strong>Description</strong>

                        <span>
                            ${report.description}
                        </span>

                    </div>

                    ${report.photo ? `
                        <div class="officer-info-box">

                            <strong>
                                📷 Complaint Photo
                            </strong>

                            <img
                                src="${report.photo}"
                                alt="Complaint Photo"
                                style="
                                    max-width: 300px;
                                    width: 100%;
                                    margin-top: 10px;
                                    border-radius: 8px;
                                "
                            >

                        </div>
                    ` : ""}

                    <br>

                    <div class="officer-info-box">

                        <strong>🏢 Department</strong>

                        <select
                            onchange="
                                updateReportDepartment(
                                    ${index},
                                    this.value
                                )
                            "
                        >

                            <option value="">
                                Select Department
                            </option>

                            <option value="Sanitation"
                                ${report.department === "Sanitation"
                                    ? "selected"
                                    : ""}>
                                Sanitation
                            </option>

                            <option value="Roads"
                                ${report.department === "Roads"
                                    ? "selected"
                                    : ""}>
                                Roads
                            </option>

                            <option value="Electrical"
                                ${report.department === "Electrical"
                                    ? "selected"
                                    : ""}>
                                Electrical
                            </option>

                            <option value="Water Supply"
                                ${report.department === "Water Supply"
                                    ? "selected"
                                    : ""}>
                                Water Supply
                            </option>

                            <option value="Drainage / Sewage"
                                ${report.department === "Drainage / Sewage"
                                    ? "selected"
                                    : ""}>
                                Drainage / Sewage
                            </option>

                            <option value="General Civic Services"
                                ${report.department === "General Civic Services"
                                    ? "selected"
                                    : ""}>
                                General Civic Services
                            </option>

                        </select>

                    </div>

                    <br>

                    <div class="status-actions">

                        <button
                            class="status-button status-pending-button"
                            onclick="
                                updateReportStatus(
                                    ${index},
                                    'Pending'
                                )
                            "
                        >
                            Pending
                        </button>

                        <button
                            class="status-button status-progress-button"
                            onclick="
                                updateReportStatus(
                                    ${index},
                                    'In Progress'
                                )
                            "
                        >
                            In Progress
                        </button>

                        <button
                            class="status-button status-resolved-button"
                            onclick="
                                updateReportStatus(
                                    ${index},
                                    'Resolved'
                                )
                            "
                        >
                            Resolved
                        </button>

                    </div>
                `;

                officerReportsList.appendChild(card);
            });

               })
        .catch(function (error) {

            console.error(
                "Failed to load officer reports:",
                error
            );

            officerReportsList.innerHTML = `
                <p>
                    ❌ Unable to load reports.
                </p>
            `;

        });

}

// =========================
// UPDATE REPORT STATUS
// =========================

function updateReportStatus(index, newStatus) {

    fetch("http://localhost:3000/api/reports")
        .then(function(response) {
            return response.json();
        })
        .then(function(reports) {

            const report = reports[index];

            if (!report) {
                alert("Report not found");
                return;
            }

            const user = JSON.parse(
                localStorage.getItem("swacchaUser")
            );

            return fetch(
                "http://localhost:3000/api/reports/" +
                report.id +
                "/status",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: newStatus,
                        userEmail: user.email
                    })
                }
            );
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {

            console.log("STATUS:", data);

            if (data.message) {
                loadOfficerReports();
            }

        })
        .catch(function(error) {

            console.error(error);
            alert("Status update failed.");

        });
}

function updateReportStatus(index, newStatus) {

    fetch("http://localhost:3000/api/reports")
        .then(function (response) {
            return response.json();
        })
        .then(function (reports) {

            const report = reports[index];

            if (!report) {
                alert("Report not found.");
                return;
            }

            const savedUser =
                localStorage.getItem("swacchaUser");

            const user =
                savedUser
                    ? JSON.parse(savedUser)
                    : null;

            if (!user || user.role !== "officer") {
                alert("Only officers can update report status.");
                return;
            }

            return fetch(
                "http://localhost:3000/api/reports/" +
                report.id +
                "/status",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        status: newStatus,
                        userEmail: user.email
                    })
                }
            );
        })
        .then(function (response) {

            if (!response) {
                return;
            }

            return response.json();
        })
        .then(function (data) {

            if (!data) {
                return;
            }

            console.log(
                "Status updated:",
                data
            );

            loadOfficerReports();

        })
        .catch(function (error) {

            console.error(
                "Status update failed:",
                error
            );

            alert(
                "Unable to update report status."
            );

        });
}

function updateReportStatus(index, newStatus) {

    fetch("http://localhost:3000/api/reports")
        .then(function (response) {
            return response.json();
        })
        .then(function (reports) {

            const report = reports[index];

            if (!report) {
                alert("Report not found.");
                return;
            }

            const savedUser =
                localStorage.getItem("swacchaUser");

            const user =
                savedUser
                    ? JSON.parse(savedUser)
                    : null;

            if (!user || user.role !== "officer") {
                alert("Only officers can update report status.");
                return;
            }

            return fetch(
                "http://localhost:3000/api/reports/" +
                report.id +
                "/status",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        status: newStatus,
                        userEmail: user.email
                    })
                }
            );
        })
        .then(function (response) {

            if (!response) {
                return;
            }

            return response.json();
        })
        .then(function (data) {

            if (!data) {
                return;
            }

            console.log(
                "Status updated:",
                data
            );

            loadOfficerReports();

        })
        .catch(function (error) {

            console.error(
                "Status update failed:",
                error
            );

            alert(
                "Unable to update report status."
            );

        });
}

function updateReportDepartment(index, department) {

    fetch("http://localhost:3000/api/reports")
        .then(function (response) {
            return response.json();
        })
        .then(function (reports) {

            const report = reports[index];

            if (!report) {
                alert("Report not found.");
                return;
            }

           return fetch(
    "http://localhost:3000/api/reports/" +
    report.id +
    "/department",
    {
        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            department: department
        })
    }
);
           
        })
        .then(function (response) {

            if (!response) {
                return;
            }

            return response.json();
        })
        .then(function (data) {

            if (!data) {
                return;
            }

            console.log(
                "Department updated:",
                data
            );

            loadOfficerReports();
        })
        .catch(function (error) {

            console.error(
                "Department update failed:",
                error
            );

            alert(
                "Unable to update department. Please make sure the backend is running."
            );
        });
}

// =========================
// REFRESH BUTTON
// =========================

if (refreshReports) {

    refreshReports.addEventListener(
        "click",
        loadOfficerReports
    );

}


// Load reports when page opens

loadOfficerReports();
// =========================
// AUTOMATIC DEPARTMENT
// =========================

function getDepartment(category) {

    switch (category) {

        case "garbage":
            return "Sanitation";

        case "road":
            return "Roads";

        case "streetlight":
        case "electricity":
            return "Electrical";

        case "water":
            return "Water Supply";

        case "drainage":
            return "Drainage / Sewage";

        default:
            return "General Civic Services";
    }

}
// TEST BACKEND CONNECTION
fetch("http://localhost:3000/")
    .then(function (response) {
        return response.text();
    })
    .then(function (data) {
        console.log("Backend:", data);
    })
    .catch(function (error) {
        console.error("Backend connection failed:", error);
    });

    // USER SIGNUP
const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const fullName =
            document.getElementById("name").value;

        const mobile =
            document.getElementById("mobile").value;

        const email =
            document.getElementById("email").value;

        const city =
            document.getElementById("city").value;

        const area =
            document.getElementById("area").value;

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;


        if (password !== confirmPassword) {

            alert("Passwords do not match.");

            return;
        }


        fetch("http://localhost:3000/api/signup", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                fullName: fullName,
                mobile: mobile,
                email: email,
                city: city,
                area: area,
                password: password

            })

        })

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            if (data.message) {

                alert(data.message);

            }

            if (data.success) {

                window.location.href =
                    "login.html";

            }

        })

        .catch(function (error) {

            console.error(
                "Signup error:",
                error
            );

            alert(
                "Unable to connect to the SWACCHA server."
            );

        });

    });

}

// =========================
// USER LOGIN
// =========================

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value;

        const password =
            document.getElementById("loginPassword").value;


        fetch("http://localhost:3000/api/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                password: password
            })

        })
        .then(function (response) {

            return response.json();

        })
        .then(function (data) {

            if (data.success) {

                alert("Login successful!");

                // Save logged-in user
                localStorage.setItem(
                    "swacchaUser",
                    JSON.stringify(data.user)
                );

                // Go to dashboard

if (data.user && data.user.role === "officer") {

    window.location.href =
        "officer.html";

} else {

    window.location.href =
        "dashboard.html";
}

} else {

    alert(
        data.message ||
        "Invalid email or password."
    );

            }

        })
        .catch(function (error) {

            console.error(
                "Login error:",
                error
            );

            alert(
                "Unable to connect to the SWACCHA server."
            );

        });

    });

}

// =========================
// SHOW LOGGED-IN USER NAME
// =========================

const welcomeMessage =
    document.getElementById("welcomeMessage");

if (welcomeMessage) {

    const savedUser =
        localStorage.getItem("swacchaUser");

    if (savedUser) {

        const user =
            JSON.parse(savedUser);

        welcomeMessage.textContent =
            "Welcome, " + user.fullName + "! 👋";

    }

}

// =========================
// DASHBOARD LOGIN PROTECTION
// =========================

const dashboardPage =
    document.getElementById("welcomeMessage");

if (dashboardPage) {

    const savedUser =
        localStorage.getItem("swacchaUser");

    if (!savedUser) {

        window.location.href = "login.html";

    }

}

// =========================
// DISPLAY USER PROFILE
// =========================

const profileSavedUser =
    localStorage.getItem("swacchaUser");

if (profileSavedUser) {

    const user =
        JSON.parse(profileSavedUser);

    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    const profileMobile =
        document.getElementById("profileMobile");

    const profileCity =
        document.getElementById("profileCity");

    const profileArea =
        document.getElementById("profileArea");


    if (profileName) {
        profileName.textContent =
            user.fullName || "Not available";
    }

    if (profileEmail) {
        profileEmail.textContent =
            user.email || "Not available";
    }

    if (profileMobile) {
        profileMobile.textContent =
            user.mobile || "Not available";
    }

    if (profileCity) {
        profileCity.textContent =
            user.city || "Not available";
    }

    if (profileArea) {
        profileArea.textContent =
            user.area || "Not available";
    }

}

// =========================
// LOAD NOTIFICATIONS
// =========================

function loadNotifications() {

    const savedUser =
        localStorage.getItem("swacchaUser");

    if (!savedUser) {
        return;
    }

    const user = JSON.parse(savedUser);

    const notificationList =
        document.getElementById("notificationsList");

    if (!notificationList) {
        return;
    }

    fetch(
        "http://localhost:3000/api/notifications/" +
        encodeURIComponent(user.email)
    )
    .then(function(response) {
        return response.json();
    })
    .then(function(notifications) {

        if (notifications.length === 0) {

            notificationList.innerHTML =
                "<p>No new notifications.</p>";

            return;
        }

        notificationList.innerHTML = "";

        notifications.forEach(function(notification) {

            const item =
                document.createElement("div");

            item.className =
                "notification-item";

            item.innerHTML =
                "🔔 " + notification.message;

            notificationList.appendChild(item);

        });

    })
    .catch(function(error) {

        console.error(
            "Notification loading failed:",
            error
        );

        notificationList.innerHTML =
            "<p>Unable to load notifications.</p>";

    });
}

loadNotifications();

function viewReportDetails(reportId) {

    const savedUser =
        localStorage.getItem("swacchaUser");

    if (!savedUser) {
        window.location.href = "login.html";
        return;
    }

    fetch(
        "http://localhost:3000/api/reports"
    )
    .then(function(response) {
        return response.json();
    })
    .then(function(reports) {

        const report = reports.find(function(item) {
            return item.id === reportId;
        });

        if (!report) {
            alert("Complaint not found.");
            return;
        }

        alert(
            "Complaint ID: " + report.id +
            "\n\nCategory: " + report.category +
            "\nStatus: " + report.status +
            "\nDepartment: " + (report.department || "Not assigned") +
            "\nPriority: " + (report.priority || "Medium")
        );

    })
    .catch(function(error) {

        console.error(
            "Failed to load complaint:",
            error
        );

        alert("Unable to load complaint details.");
    });
}