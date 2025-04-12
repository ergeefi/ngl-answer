const questionList = document.getElementById("questionList");

fetch("https://ngl-answer-be.up.railway.app/answers")
  .then(res => res.json())
  .then(data => {
    data.forEach(item => {
      const li = document.createElement("li");

      li.innerHTML = `
        <a href="view.html?id=${item.id}">
          <img src="${item.image}" alt="Pertanyaan" />
          <div class="overlay">
            <button>Lihat Balasan</button>
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
