window.onload = async () => {
  google.charts.load('current', {'packages':['gantt']});
  google.charts.setOnLoadCallback(drawChart);

  async function drawChart() {
      var data = new google.visualization.DataTable();
      // id, title, submitFile, start_date, end_date, null, 100, null
      data.addColumn('string', 'Task ID');
      data.addColumn('string', 'Task Name');
      data.addColumn('string', 'Resource');
      data.addColumn('date', 'Start Date');
      data.addColumn('date', 'End Date');
      data.addColumn('number', 'Duration');
      data.addColumn('number', 'Percent Complete');
      data.addColumn('string', 'Dependencies');
      var rows = await getTasks();

      data.addRows(rows);
      var options = {
        height: 400,
        gantt: {
          trackHeight: 30
        }
      };

      // 'Baltimore Ravens',     new Date(2000, 8, 5), new Date(2001, 1, 5)
      var chart = new google.visualization.Gantt(document.getElementById('chart_div'));
      chart.draw(data, options);
  }
};

async function getTasks() {
    var project_no = document.getElementById('project').getAttribute('value');

    var taskList = (await axios.get(`/projects/getTasks/${project_no}`)).data;
    for(let i=0; i<taskList.length; i++) {
      taskList[i][3] = new Date(taskList[i][3]);
      taskList[i][4] = new Date(taskList[i][4]);
    }
    return taskList;
}