let total = 0;

// SIMPAN DATA INPUT
function simpanData(){

    let nama = document.getElementById("nama").value;
    let kondisi = document.getElementById("kondisi").value;
    let umur = document.getElementById("umur").value;

    if(nama === "" || kondisi === "" || umur === ""){
        alert("Harap isi semua data!");
        return;
    }

    // simpan data
    localStorage.setItem("nama", nama);
    localStorage.setItem("kondisi", kondisi);
    localStorage.setItem("umur", umur);

    // pindah halaman
    window.location.href = "menu.html";
}


// SAAT MENU DIBUKA
window.onload = function(){

    let nama = localStorage.getItem("nama");
    let kondisi = localStorage.getItem("kondisi");
    let umur = localStorage.getItem("umur");

    if(!kondisi) return;

    // Cek apakah elemen welcome ada (hanya di menu.html)
    const welcomeElement = document.getElementById("welcome");
    if(welcomeElement) {
        // tampilkan sapaan
        welcomeElement.innerText = "Rekomendasi untuk: " + kondisi;

        // AMBIL REKOMENDASI DARI SERVER
        if(nama && kondisi){
            getRecommendationFromServer(nama, umur, kondisi);
        }

        // FILTER MENU REKOMENDASI
        document.querySelectorAll(".rekomendasi")
        .forEach(menu => {

            if(menu.dataset.category === kondisi){
                menu.style.display = "block";
            }else{
                menu.style.display = "none";
        }

    });

}

// FUNGSI MENDAPAT REKOMENDASI DARI SERVER
async function getRecommendationFromServer(nama, umur, kondisi){

    try {
        // Tampilkan loading
        let container = document.querySelector(".container.horizontal-menu");
        if(!container) return;

        // Kirim request ke backend
        const response = await fetch('/api/recommendation', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nama: nama,
                umur: parseInt(umur) || 25,
                kondisi: kondisi
            })
        });

        if(!response.ok){
            console.error("Error dari server:", response.status);
            showRecommendationError("Server error");
            return;
        }

        const data = await response.json();

        if(data.success && data.recommendation){
            displayGeminiRecommendation(data.recommendation);
        } else {
            showRecommendationError(data.error || "Gagal memuat rekomendasi");
        }

    } catch(error){
        console.error("Terjadi kesalahan saat mengambil rekomendasi:", error);
        showRecommendationError("Terjadi kesalahan: " + error.message);
    }
}

// TAMPILKAN REKOMENDASI GEMINI
function displayGeminiRecommendation(recommendation){

    let container = document.querySelector(".container.horizontal-menu");
    
    if(!container) return;

    // BUAT ELEMEN UNTUK REKOMENDASI AI
    let aiRecommendationDiv = document.createElement("div");
    aiRecommendationDiv.className = "ai-recommendation";
    aiRecommendationDiv.innerHTML = `
        <div class="ai-header"> Rekomendasi AI Khusus Anda</div>
        <div class="ai-content">
            ${recommendation.replace(/\n/g, '<br>')}
        </div>
    `;

    // MASUKKAN DI AWAL CONTAINER
    container.insertBefore(aiRecommendationDiv, container.firstChild);
}

// TAMPILKAN PESAN ERROR
function showRecommendationError(errorMsg){
    let container = document.querySelector(".container.horizontal-menu");
    
    if(!container) return;

    let errorDiv = document.createElement("div");
    errorDiv.className = "ai-recommendation error";
    errorDiv.innerHTML = `
        <div class="ai-header">⚠️ Gagal Memuat Rekomendasi AI</div>
        <div class="ai-content">
            ${errorMsg || "Pastikan server berjalan dan koneksi internet aktif."}
        </div>
    `;

    container.insertBefore(errorDiv, container.firstChild);
}


// TAMBAH KE KERANJANG
function addToCart(nama, harga){

    let cart = document.getElementById("cartItems");

    let item = document.createElement("div");

    item.innerHTML =
        `${nama} - Rp ${harga.toLocaleString()}`;

    cart.appendChild(item);

    total += harga;

    document.getElementById("total")
    .innerText = total.toLocaleString();

}

// CHECKOUT
function checkout(){

    if(total <= 0){
        alert("Keranjang masih kosong!");
        return;
    }

    // simpan total
    localStorage.setItem("totalBayar", total);

    // pindah ke halaman pembayaran
    window.location.href = "payment.html";
}

// TAMPILKAN TOTAL DI HALAMAN PAYMENT
window.addEventListener("load", () => {

    let grandTotal =
        document.getElementById("grandTotal");

    if(grandTotal){

        let totalBayar =
            localStorage.getItem("totalBayar");

        grandTotal.innerText =
            Number(totalBayar).toLocaleString();

    }

});


// PROSES BAYAR
function bayar(){

    let metode =
        document.getElementById("metode").value;

    if(metode === ""){
        alert("Pilih metode pembayaran!");
        return;
    }

    alert(
        "Pembayaran berhasil!\nMetode: "
        + metode
    );

    // reset total
    localStorage.removeItem("totalBayar");

    // kembali ke menu
    window.location.href = "menu.html";
}}