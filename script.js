const apiUrl = 'https://localhost:7172/api/books';
let allBooks = [];
let currentPage = 1;
let totalPages = 1;
let currentCategory = 'all';
let currentSearch = '';

async function fetchBooks(page = 1) {
    try {
        const container = document.getElementById('booksContainer');
        container.classList.add('flip-animation');
        const url = `${apiUrl}?page=${page}&pageSize=20&category=${currentCategory}&search=${currentSearch}`;
        const response = await fetch(url);
        const result = await response.json();
        allBooks = result.data;
        currentPage = result.page;
        totalPages = Math.ceil(result.total / result.pageSize);
        renderBooks(allBooks);
        renderPagination();
        if (page === 1 && allBooks.length > 0) renderCategories();
        setTimeout(() => container.classList.remove('flip-animation'), 600);
    } catch (error) { console.error(error); }
}

function renderBooks(booksToRender) {
    const container = document.getElementById('booksContainer');
    container.innerHTML = '';
    if (booksToRender.length === 0) { container.innerHTML = '<div class="col-12 text-center py-5"><h4 class="text-white">لا توجد كتب</h4></div>'; return; }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    booksToRender.forEach(book => {
        const cover = book.coverUrl || 'https://via.placeholder.com/300x400?text=No+Cover';
        const rating = book.rating || 0;
        const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

        let borrowBtn = currentUser
            ? `<button class="btn btn-primary-custom w-100 mt-3 fw-bold" onclick="borrowBook('${book.isbn}')">استعارة الكتاب</button>`
            : `<button class="btn btn-secondary w-100 mt-3 fw-bold" disabled>سجل دخول للاستعارة</button>`;

        const card = document.createElement('div');
        card.className = 'col-md-4 col-lg-3 mb-4';
        card.innerHTML = `
            <div class="card book-card d-flex flex-column h-100" data-tilt data-tilt-max="15" data-tilt-speed="400" data-tilt-glare="true" data-tilt-max-glare="0.2">
                <img src="${cover}" class="card-img-top book-cover" alt="${book.title}">
                <div class="card-body d-flex flex-column p-3">
                    <h6 class="card-title fw-bold text-truncate text-white">${book.title}</h6>
                    <p class="card-text text-muted mb-1 small"><i class="fas fa-pen me-1"></i>${book.author}</p>
                    <span class="badge bg-secondary mb-2 align-self-start">${book.category}</span>
                    <div class="d-flex justify-content-between align-items-center mt-auto mb-2">
                        <div class="rating-star text-warning">${stars}</div>
                        <small class="text-success fw-bold">${book.copiesAvailable} نسخة</small>
                    </div>
                    ${borrowBtn}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    VanillaTilt.init(document.querySelectorAll("#booksContainer [data-tilt]"));
}

async function renderCategories() {
    try {
        const response = await fetch(`${apiUrl}?page=1&pageSize=1000`);
        const result = await response.json();
        const categories = [...new Set(result.data.map(book => book.category))];
        const categoriesList = document.getElementById('categoriesList');
        categoriesList.innerHTML = '';
        const allBtn = document.createElement('button');
        allBtn.className = 'category-btn active';
        allBtn.innerText = 'الكل';
        allBtn.onclick = (e) => filterBooks('all', e);
        categoriesList.appendChild(allBtn);
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.innerText = cat;
            btn.onclick = (e) => filterBooks(cat, e);
            categoriesList.appendChild(btn);
        });
    } catch (error) { console.error(error); }
}

function filterBooks(category, event) {
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');
    currentCategory = category;
    currentPage = 1;
    fetchBooks(1);
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    container.innerHTML = '';
    if (totalPages <= 1) return;
    if (currentPage > 1) container.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="fetchBooks(${currentPage - 1}); return false;">السابق</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            container.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="fetchBooks(${i}); return false;">${i}</a></li>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            container.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    if (currentPage < totalPages) container.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="fetchBooks(${currentPage + 1}); return false;">التالي</a></li>`;
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    errorDiv.style.display = 'none';
    try {
        const response = await fetch('https://localhost:7172/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (response.ok) {
            const user = await response.json();
            localStorage.setItem('currentUser', JSON.stringify(user));
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();
            updateUIForLoggedInUser(user);
            fetchBooks(1);
        } else {
            errorDiv.innerText = await response.text();
            errorDiv.style.display = 'block';
        }
    } catch (err) { errorDiv.innerText = "خطأ في الاتصال"; errorDiv.style.display = 'block'; }
});

function updateUIForLoggedInUser(user) {
    const navLinks = document.getElementById('navLinks');
    navLinks.innerHTML = `
        ${user.role === 'ADMIN' ? '<a class="btn btn-outline-warning fw-bold px-4" href="/admin.html"><i class="fas fa-crown me-1"></i>لوحة التحكم</a>' : ''}
        ${user.role === 'MEMBER' ? '<a class="btn btn-outline-info fw-bold px-4" href="/member.html"><i class="fas fa-user me-1"></i>لوحتي</a>' : ''}
        <div class="dropdown">
            <button class="btn btn-danger dropdown-toggle px-4" type="button" data-bs-toggle="dropdown">
                <i class="fas fa-user-circle me-1"></i> ${user.name}
            </button>
            <ul class="dropdown-menu dropdown-menu-dark">
                <li><a class="dropdown-item" href="#" onclick="logout()"><i class="fas fa-sign-out-alt me-2"></i>تسجيل خروج</a></li>
            </ul>
        </div>
    `;
    if (user.role === 'MEMBER') loadRecommendations(user.id);
}

function logout() {
    localStorage.removeItem('currentUser');
    document.getElementById('recommendationsSection').style.display = 'none';
    location.reload();
}

async function borrowBook(isbn) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return alert("يجب تسجيل الدخول أولاً");
    try {
        const response = await fetch('https://localhost:7172/api/loans/borrow', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookIsbn: isbn, memberId: currentUser.id })
        });
        if (response.ok) {
            const data = await response.json();
            alert(`تم الاستعارة بنجاح! تاريخ الإرجاع: ${new Date(data.dueDate).toLocaleDateString('ar-EG')}`);
            fetchBooks(currentPage);
            loadRecommendations(currentUser.id);
        } else { alert(await response.text()); }
    } catch (error) { alert("حدث خطأ"); }
}

async function loadRecommendations(memberId) {
    try {
        const response = await fetch(`${apiUrl}/recommendations/${memberId}`);
        const recs = await response.json();
        const section = document.getElementById('recommendationsSection');
        const container = document.getElementById('recommendationsContainer');
        if (recs.length === 0) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        container.innerHTML = '';
        recs.forEach(book => {
            const cover = book.coverUrl || 'https://via.placeholder.com/300x400?text=No+Cover';
            const rating = book.rating || 0;
            const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
            container.innerHTML += `
                <div class="col-md-4 col-lg-3 mb-4">
                    <div class="card book-card h-100 border-info" style="border-width: 2px;" data-tilt data-tilt-max="15">
                        <img src="${cover}" class="card-img-top book-cover">
                        <div class="card-body d-flex flex-column">
                            <h6 class="card-title fw-bold text-truncate text-white">${book.title}</h6>
                            <p class="card-text text-muted mb-1 small"><i class="fas fa-pen me-1"></i>${book.author}</p>
                            <span class="badge bg-secondary mb-2 align-self-start">${book.category}</span>
                            <div class="d-flex justify-content-between align-items-center mt-auto">
                                <div class="rating-star text-warning">${stars}</div>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        VanillaTilt.init(document.querySelectorAll("#recommendationsContainer [data-tilt]"));
    } catch (error) { console.error(error); }
}

async function loadTrending() {
    try {
        const response = await fetch(`${apiUrl}/trending`);
        const books = await response.json();
        const container = document.getElementById('trendingContainer');
        container.innerHTML = '';
        books.forEach(book => {
            const cover = book.coverUrl || 'https://via.placeholder.com/300x400?text=No+Cover';
            container.innerHTML += `
                <div class="col-md-3 mb-4">
                    <div class="card book-card h-100 border-danger" style="border-width: 2px;" data-tilt data-tilt-max="15">
                        <img src="${cover}" class="card-img-top book-cover">
                        <div class="card-body text-center d-flex flex-column justify-content-between">
                            <div>
                                <h6 class="fw-bold text-white">${book.title}</h6>
                                <small class="text-muted d-block mb-2">${book.author}</small>
                            </div>
                            <span class="badge bg-danger">🔥 الأكثر طلباً</span>
                        </div>
                    </div>
                </div>`;
        });
        VanillaTilt.init(document.querySelectorAll("#trendingContainer [data-tilt]"));
    } catch (error) { console.error(error); }
}

async function loadTopRated() {
    try {
        const response = await fetch(`${apiUrl}/top-rated`);
        const books = await response.json();
        const container = document.getElementById('topRatedContainer');
        container.innerHTML = '';
        books.forEach(book => {
            const cover = book.coverUrl || 'https://via.placeholder.com/300x400?text=No+Cover';
            const rating = book.rating || 0;
            const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
            container.innerHTML += `
                <div class="col-md-3 mb-4">
                    <div class="card book-card h-100 border-warning" style="border-width: 2px;" data-tilt data-tilt-max="15">
                        <img src="${cover}" class="card-img-top book-cover">
                        <div class="card-body text-center d-flex flex-column justify-content-between">
                            <div>
                                <h6 class="fw-bold text-white">${book.title}</h6>
                                <small class="text-muted d-block mb-1">${book.author}</small>
                            </div>
                            <div class="rating-star text-warning">${stars}</div>
                        </div>
                    </div>
                </div>`;
        });
        VanillaTilt.init(document.querySelectorAll("#topRatedContainer [data-tilt]"));
    } catch (error) { console.error(error); }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchBooks(1);
    loadTrending();
    loadTopRated();
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) updateUIForLoggedInUser(JSON.parse(savedUser));
});