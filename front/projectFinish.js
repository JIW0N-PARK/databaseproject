window.onload = async function () {
    setOnButtonListener();
};

async function setOnButtonListener() {
    document.getElementById('grantKeyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        var project_no = document.getElementById('project_no').innerText;
        var customer_id = document.getElementById('customer_id').innerText;
        var start_date = document.getElementById('start_date').innerText;

        // 서버에 인증키를 만들기 위핸 정보를 POST로 보냄
        const result = (await axios.post('/projects/finish', {
            project_no, customer_id, start_date
        })).data;

        if(result) {
            return alert("인증키를 성공적으로 부여했습니다!");
        } else {
            return alert("인증키를 부여하지 못했습니다.");
        }

    });
}