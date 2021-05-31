// 전역 변수
var option = '문서';
var emp_no = '미선택';
var project_no = 1;

// window onload시 프로젝트 리스트를 가져오고 이벤트 리스너를 등록함
window.onload = function () {
    project_no = document.getElementById('project').getAttribute('value');

    // submitFileSelect에 대한 이벤트 리스너 등록
    document.getElementById('submitFileSelect').addEventListener('change', async (e) => {
        e.preventDefault();
        option = e.target.value;
        setEmpSelectorOption(option);
        
    });

    // empSelect에 대한 이벤트 리스너 등록
    document.getElementById('empSelect').addEventListener('change', async (e) => {
        e.preventDefault();
        emp_no = e.target.value;
    });


    // 업무 등록 버튼에 대한 이벤트 리스너 등록
    document.getElementById('register').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = e.target.title.value;
        const content = e.target.content.value;
        const start_date = e.target.start_date.value;
        const end_date = e.target.end_date.value;

        if(!title) {
            return alert('업무 제목을 입력해주세요.');
        }
        if(!content) {
            return alert('업무 내용을 입력해주세요.');
        }
        if(!startDate) {
            return alert('업무 시작 날짜를 입력해주세요.');
        }
        if(!endDate) {
            return alert('업무 마감 날짜를 입력해주세요.');
        }
        if(option != null || option != '미선택') {
            return alert('제출 파일 종류를 선택해주세요.');
        }
        if(emp_no == '미선택' || !emp_no) {
            return alert('업무를 수행할 직원을 선택해주세요.');
        }

        const result = await axios.post('/projects/addTask', { title, content, start_date, end_date, option, emp_no, project_no });
        
        if(result.data == true) {
            alert('성공적으로 평가를 마쳤습니다!');
            window.location.replace('/');
        } else {
            alert('평가가 서버에 저장되지 않았습니다.');
        }
    });
};


async function setEmpSelectorOption(option) {
    var data = [];
    switch(option) {
        case 'Html/Javascript':
            data = (await axios.get('/projects/addTask/all/HJ')).data;
            break;

        case 'C#/C/C++':
            data = (await axios.get('/projects/addTask/all/CCC')).data;
            break;

        case 'Dart/Flutter/Java':
            data = (await axios.get('/projects/addTask/all/DFJ')).data;
            break;

        case 'Python':
            data = (await axios.get('/projects/addTask/all/Python')).data;
            break;

        default:
            data = (await axios.get(`/projects/addTask/all/${project_no}`)).data;
    }

    // option 초기화
    var employee_select = document.getElementById('empSelect');

    while(employee_select.firstChild) {
        employee_select.removeChild(employee_select.firstChild);
    }

    //기본 미선택 옵션 생성 & 추가
    var options = document.createElement('option');
    options.value = '미선택';
    options.innerHTML = '미선택';
    employee_select.appendChild(options);
    emp_no = '미선택';

    // option에 추가
    for(let i=0; i<data.length; i++) {
        let options = document.createElement('option');

        options.value = data[i][0];
        options.innerHTML = data[i][1];

        employee_select.appendChild(options);
    }

}