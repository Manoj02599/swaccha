"""
Swaccha Backend - Flask + SQLite + Login System
-------------------------------------------------
Adds on top of the original backend:
1. Signup (citizen or officer)
2. Login / Logout using Flask sessions (simple, beginner-friendly)
3. Citizens can only submit complaints and see their own
4. Officers can see all complaints and update status

Run with: python app.py
Server runs at: http://127.0.0.1:5000
"""

import os
import sqlite3
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'change-this-to-a-random-secret-key'  # needed for sessions to work securely

# allow_headers/supports_credentials lets the browser send/receive login cookies
CORS(app, supports_credentials=True)

UPLOAD_FOLDER = 'uploads'
DB_FILE = 'swaccha.db'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ---------- Database setup ----------
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('citizen', 'officer'))
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            photo_filename TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            category TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    conn.commit()
    conn.close()


def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------- Auth helper decorators ----------
def login_required(f):
    """Blocks access unless the user is logged in (any role)."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)
    return wrapper


def officer_required(f):
    """Blocks access unless the logged-in user is an officer."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        if session.get('role') != 'officer':
            return jsonify({'error': 'Officer access only'}), 403
        return f(*args, **kwargs)
    return wrapper


# ---------- Auth routes ----------

@app.route('/api/signup', methods=['POST'])
def signup():
    """
    Create a new account.
    Expects JSON: { "name": "...", "email": "...", "password": "...", "role": "citizen" or "officer" }
    """
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not all([name, email, password, role]) or role not in ['citizen', 'officer']:
        return jsonify({'error': 'Missing or invalid fields'}), 400

    password_hash = generate_password_hash(password)

    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            (name, email, password_hash, role)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Email already registered'}), 409
    conn.close()

    return jsonify({'message': 'Account created successfully'}), 201


@app.route('/api/login', methods=['POST'])
def login():
    """
    Log in an existing user.
    Expects JSON: { "email": "...", "password": "..." }
    """
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid email or password'}), 401

    # Save login info in the session (a secure cookie the browser stores)
    session['user_id'] = user['id']
    session['name'] = user['name']
    session['role'] = user['role']

    return jsonify({'message': 'Login successful', 'name': user['name'], 'role': user['role']}), 200


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'}), 200


@app.route('/api/me', methods=['GET'])
def me():
    """Lets the frontend check if someone is currently logged in."""
    if 'user_id' not in session:
        return jsonify({'logged_in': False}), 200
    return jsonify({
        'logged_in': True,
        'name': session.get('name'),
        'role': session.get('role')
    }), 200


# ---------- Complaint routes ----------

@app.route('/api/complaints', methods=['POST'])
@login_required
def submit_complaint():
    """Citizen (logged in) submits a new complaint."""
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo uploaded'}), 400

    photo = request.files['photo']
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    category = request.form.get('category')

    if not all([photo, latitude, longitude, category]):
        return jsonify({'error': 'Missing required fields'}), 400

    if photo.filename == '' or not allowed_file(photo.filename):
        return jsonify({'error': 'Invalid photo file'}), 400

    filename = secure_filename(f"{int(datetime.now().timestamp() * 1000)}_{photo.filename}")
    photo.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    conn = get_db_connection()
    conn.execute(
        'INSERT INTO complaints (user_id, photo_filename, latitude, longitude, category, status, created_at) '
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
        (session['user_id'], filename, float(latitude), float(longitude), category, 'Pending', datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    return jsonify({'message': 'Complaint submitted successfully'}), 201


@app.route('/api/my-complaints', methods=['GET'])
@login_required
def my_complaints():
    """Citizen views only their own submitted complaints."""
    conn = get_db_connection()
    rows = conn.execute(
        'SELECT * FROM complaints WHERE user_id = ? ORDER BY id DESC', (session['user_id'],)
    ).fetchall()
    conn.close()

    return jsonify([_complaint_to_dict(row) for row in rows]), 200


@app.route('/api/complaints', methods=['GET'])
@officer_required
def get_complaints():
    """Officer views all complaints, newest first. Optional ?status=Pending filter."""
    status_filter = request.args.get('status')

    conn = get_db_connection()
    if status_filter:
        rows = conn.execute(
            'SELECT * FROM complaints WHERE status = ? ORDER BY id DESC', (status_filter,)
        ).fetchall()
    else:
        rows = conn.execute('SELECT * FROM complaints ORDER BY id DESC').fetchall()
    conn.close()

    return jsonify([_complaint_to_dict(row) for row in rows]), 200


@app.route('/api/complaints/<int:complaint_id>/status', methods=['PATCH'])
@officer_required
def update_status(complaint_id):
    """Officer updates a complaint's status."""
    data = request.get_json()
    new_status = data.get('status') if data else None

    if new_status not in ['Pending', 'In Progress', 'Resolved']:
        return jsonify({'error': 'Invalid status value'}), 400

    conn = get_db_connection()
    result = conn.execute('UPDATE complaints SET status = ? WHERE id = ?', (new_status, complaint_id))
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({'error': 'Complaint not found'}), 404

    return jsonify({'message': 'Status updated successfully'}), 200


def _complaint_to_dict(row):
    return {
        'id': row['id'],
        'photo_url': f'/uploads/{row["photo_filename"]}',
        'latitude': row['latitude'],
        'longitude': row['longitude'],
        'category': row['category'],
        'status': row['status'],
        'created_at': row['created_at']
    }


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/')
def home():
    return jsonify({'message': 'Swaccha backend is running.'})


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)