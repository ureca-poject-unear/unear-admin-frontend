document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    eventName: document.getElementById('eventName').value.trim(),
    description: document.getElementById('description').value.trim(),
    latitude: parseFloat(document.getElementById('latitude').value),
    longitude: parseFloat(document.getElementById('longitude').value),
    radius: parseInt(document.getElementById('radius').value),
    startAt: document.getElementById('startDate').value,
    endAt: document.getElementById('endDate').value,
  };

  try {
    const response = await fetch('http://localhost:8082/admin/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('서버 응답 형식이 잘못되었습니다.');
    }

    const result = await response.json();

    if (response.ok) {
      alert('이벤트 등록 성공!');
      window.location.href = './event-step2.html';
    } else {
      // ✅ 서버에서 내려준 메시지를 그대로 출력
      alert(`등록 실패: ${result.message || '오류가 발생했습니다.'}`);
    }
  } catch (err) {
    console.error(err); // 콘솔에 에러 남기기
    alert('네트워크 오류 또는 서버 문제로 요청이 실패했습니다.');
  }
});
