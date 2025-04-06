const questionList = document.getElementById("questionList");

fetch("http://localhost:3000/answers")
  .then(res => res.json())
  .then(data => {
    data.forEach(item => {
      const li = document.createElement("li");

      li.innerHTML = `
        <a href="view.html?id=${item.id}">
          <img src="${item.image}" alt="Pertanyaan" />
          <div class="overlay">
            <button>Lihat Jawaban</button>
          </div>
        </a>
      `;

      questionList.appendChild(li);
    });
  })
  .catch(err => {
    console.error("Gagal mengambil data:", err);
    questionList.innerHTML = "<li>Gagal memuat pertanyaan.</li>";
  });
