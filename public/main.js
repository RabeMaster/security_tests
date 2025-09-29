document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://localhost:3000"; // 실제 백엔드 주소로 변경 필요

  const nav = document.querySelector("header nav");

  // 1. 로그인 상태 확인 및 네비게이션 바 렌더링
  const checkAuth = async () => {
    try {
      // '/api/auth/status' 같은 엔드포인트로 현재 로그인 상태(사용자 정보)를 가져옵니다.
      const response = await fetch(`${API_BASE_URL}/api/users/me`);

      if (response.ok) {
        const user = await response.json();
        nav.innerHTML = `
                    <span><strong>${user.username}</strong>님 반갑습니다.</span>
                    <a href="/write.html">글쓰기</a>
                    <button class="logout-btn">로그아웃</button>
                `;
        const logoutBtn = nav.querySelector(".logout-btn");
        logoutBtn.addEventListener("click", handleLogout);
      } else {
        renderLoggedOutNav();
      }
    } catch (error) {
      console.error("인증 상태 확인 오류:", error);
      renderLoggedOutNav();
    }
  };

  const renderLoggedOutNav = () => {
    nav.innerHTML = `
            <a href="/login.html">로그인</a>
            <a href="/register.html">회원가입</a>
        `;
  };

  const path = window.location.pathname;

  if (nav) {
    checkAuth();
  }

  if (path === "/" || path === "/index.html") {
    loadPosts();
  } else if (path === "/login.html") {
    setupLoginForm();
  } else if (path === "/register.html") {
    setupRegisterForm();
  } else if (path === "/post.html") {
    loadPostDetail();
  } else if (path === "/write.html") {
    setupWriteForm();
  }

  // 메인: 게시글 목록 불러오기
  async function loadPosts() {
    const postList = document.getElementById("post-list");
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`);
      const posts = await response.json();
      postList.innerHTML = posts
        .map(
          (post) => `
                <li>
                    <a href="/post.html?id=${post.id}">${post.title}</a>
                    <span> - 작성자: ${post.username}</span>
                </li>
            `
        )
        .join("");
    } catch (error) {
      console.error("게시글 로딩 실패:", error);
      postList.innerHTML = "<li>게시글을 불러오는 데 실패했습니다.</li>";
    }
  }

  // 게시글 상세: 특정 게시글 및 댓글 불러오기
  async function loadPostDetail() {
    const postId = new URLSearchParams(window.location.search).get("id");
    if (!postId) {
      window.location.href = "/";
      return;
    }

    try {
      // 게시글 정보 가져오기
      const postRes = await fetch(`${API_BASE_URL}/api/posts/${postId}`);
      const post = await postRes.json();

      document.getElementById("post-title").innerHTML = post.title;
      document.getElementById("post-author").innerHTML = post.username;
      document.getElementById("post-date").textContent = new Date(post.created_at).toLocaleString();
      document.getElementById("post-content").innerHTML = post.content;

      const imageContainer = document.getElementById("post-image-container");
      if (post.image_path) {
        imageContainer.innerHTML = `<img src="${API_BASE_URL}/${post.image_path}" alt="게시물 이미지">`;
      }

      // 댓글 정보 가져오기
      const commentsRes = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`);
      const comments = await commentsRes.json();
      const commentList = document.getElementById("comment-list");
      commentList.innerHTML = comments
        .map(
          (comment) => `
                <li>
                    <strong>${comment.username}:</strong>
                    <span>${comment.content}</span>
                </li>
            `
        )
        .join("");

      // 댓글 폼 설정
      setupCommentForm(postId);
    } catch (error) {
      console.error("게시글 상세 정보 로딩 실패:", error);
    }
  }

  // 댓글 목록만 새로고침하는 함수 추가
  async function loadComments(postId) {
    try {
      const commentsRes = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`);
      const comments = await commentsRes.json();
      const commentList = document.getElementById("comment-list");
      commentList.innerHTML = comments
        .map(
          (comment) => `
                <li>
                    <strong>${comment.username}:</strong>
                    <span>${comment.content}</span>
                </li>
            `
        )
        .join("");
    } catch (error) {
      console.error("댓글 로딩 실패:", error);
    }
  }

  // 로그인 폼 처리
  function setupLoginForm() {
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch(`${API_BASE_URL}/api/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          window.location.href = "/";
        } else {
          const error = await response.json();
          alert(`로그인 실패: ${error.message}`);
        }
      } catch (error) {
        console.error("로그인 요청 실패:", error);
        alert("로그인 중 오류가 발생했습니다.");
      }
    });
  }

  // 회원가입 폼 처리
  function setupRegisterForm() {
    const form = document.getElementById("register-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch(`${API_BASE_URL}/api/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (response.status === 201) {
          alert("회원가입 성공! 로그인 페이지로 이동합니다.");
          window.location.href = "/login.html";
        } else {
          const error = await response.json();
          alert(`회원가입 실패: ${error.message}`);
        }
      } catch (error) {
        console.error("회원가입 요청 실패:", error);
        alert("회원가입 중 오류가 발생했습니다.");
      }
    });
  }

  // 로그아웃 처리
  async function handleLogout() {
    try {
      await fetch(`${API_BASE_URL}/api/users/logout`, { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  }

  // XSS 시연 : <img src=x onerror=alert('XSS') style="display:none">
  // 글쓰기 폼 처리
  function setupWriteForm() {
    const form = document.getElementById("write-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form); // 이미지 파일 때문에 JSON으로 보내지 않음

      try {
        const response = await fetch(`${API_BASE_URL}/api/posts`, {
          method: "POST",
          body: formData, // 'Content-Type' 헤더는 FormData 사용 시 브라우저가 자동으로 설정
        });

        if (response.status === 201) {
          alert("게시글이 등록되었습니다.");
          window.location.href = "/";
        } else {
          const error = await response.json();
          alert(`등록 실패: ${error.message}`);
        }
      } catch (error) {
        console.error("게시글 등록 실패:", error);
      }
    });
  }

  // 댓글 폼 처리
  function setupCommentForm(postId) {
    const form = document.getElementById("comment-form");

    // 기존 이벤트 리스너 제거 (중복 등록 방지)
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(newForm);
      const data = { content: formData.get("comment") };

      try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.status === 201) {
          newForm.reset();
          loadComments(postId); // 댓글만 새로고침 (전체 페이지 재로드 방지)
        } else {
          const error = await response.json();
          alert(`댓글 작성 실패: ${error.message}`);
        }
      } catch (error) {
        console.error("댓글 작성 실패:", error);
      }
    });
  }
});
