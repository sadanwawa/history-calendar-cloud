// 历史信息录入/修改
const cloud = require('wx-server-sdk')

//进制转换；
//10进制 转为X进制
function num10ToNumX(num) {
  let chars = 'hoqvdprjneuszxyglcwfatmkbi'
  let charArr = chars.split('');
  let XNum = charArr.length;
  let targets = [];
  while (num > 0) {
    let yn = num % XNum;
    targets.push(yn);
    num = (num - yn) / XNum;
  }
  targets.reverse();
  let target = '';
  for (let i = 0; i < targets.length; i++) {
    target += charArr[targets[i]];
  }
  console.log('targets:' + JSON.stringify(targets));
  return target;
}

//X进制 转为10进制
function numXTNum10(str) {
  let chars = 'hoqvdprjneuszxyglcwfatmkbi'
  let charArr = chars.split('');
  let XNum = charArr.length;

  let strs = str.split('');
  let total = 0;
  for (let i = 0; i < strs.length; i++) {
    let num = 0;
    for (let j = 0; j < charArr.length; j++) {
      if (charArr[j] === strs[i]) {
        num = j;
        break;
      }
    }
    let dd = 1;
    for (let m = 0; m < strs.length - i - 1; m++) {
      dd = dd * XNum;
    }
    //取得num
    total += (num * dd);
  }
  return total;
}

//在集合中增加新的数据记录
async function addDocToCollection(db, colle, docData) {
  console.log('add'+colle);
  let result=null;
  try {
    return await db.collection(colle).add({
      // data 字段表示需新增的 JSON 数据
      data: docData
    }).then(res => {
      console.log('result:' + JSON.stringify(res))
      result={code:200,msg:'添加'+colle+'数据成功',data:res};
    }).catch(res => {
      console.log('e1' + JSON.stringify(res))
      result = { code: 300, msg: '添加' + colle + '数据失败', data: res };
    })
  } catch (e) {
    console.log('e2' + JSON.stringify(res))
    result = { code: 500, msg: '数据库异常', data: e };
  }
  return result;
}

//在集合中更新记录数据
async function updateDocToCollection(db, colle, indexData, targetData) {
  let result = null;
  try {
    await db.collection(colle).where(indexData).update({
      data: targetData
    }).then(res => {
      result = { code: 200, msg: '更新成功', data: res }
    }).catch(res => {
      result = { code: 300, msg: '更新失败', data: res }
    })
  } catch (e) {
    result = { code: 500, msg: '服务器异常', data: e }
  }
  return result;
}



// 格式化时间
function formatDate(dateInput, format) {
  let date = new Date(dateInput)

  let o = {
    'M+': date.getMonth() + 1, // month
    'd+': date.getDate(), // day
    'h+': date.getHours(), // hour
    'm+': date.getMinutes(), // minute
    's+': date.getSeconds(), // second
    'q+': Math.floor((date.getMonth() + 3) / 3), // quarter
    'S': date.getMilliseconds() // millisecond
  }

  if (/(y+)/.test(format)) {
    format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length))
  }

  for (let k in o) {
    if (new RegExp('(' + k + ')').test(format)) {
      format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length))
    }
  }
  return format
}


//有人推荐新应用时，提醒管理员审核；
/*

*/
async function sendMessTemp(db, title, appId, typeName, pushUserName, pushTime) {

  let targetOpenId = ''//管理员openid
  let time = formatDate(pushTime, 'yyyy.MM.dd')//发布时间

  let data = {
    thing1: {
      value: title//有人推荐了「appName」审核
    },
    phrase2: {
      value: typeName//"小程序"/"小游戏"
    },
    name3: {
      value: pushUserName //发布人
    },
    date4: {
      value: time//发布时间
    }
  };
  console.log('params:' + JSON.stringify(data))

  try {
    let result = await cloud.openapi.subscribeMessage.send({
      touser: targetOpenId,
      page: 'pages/index/AppDetailPage?appId=' + appId + '&backflow=true',
      data: data,
      templateId: 'J2uNSprOB4F01WwE_Vx8GUzWq2B78D2au7nbNxnJhzg'
    });
    console.log('update result:' + JSON.stringify(result));
  } catch (e) {
    console.log('update error:' + JSON.stringify(e));
  }
}


cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  const db = cloud.database({
    env: wxContext.ENV
  });

  let saveData = event['saveData'];
  if(saveData.uid){//是修改模式
    let uid = saveData.uid;
    let data = await db.collection('historyInfo').where({ uid: uid }).get();
    if (data.errMsg === 'collection.get:ok') {
      if (data.data.length === 0) {
         return {code:300,msg:'未找到目标数据，修改失败',data:data};
      }else{ 
      
        let oldData = data.data[0]//旧的数据修改
        delete saveData.uid;
        //更新数据
        saveData = Object.assign(oldData,saveData);
        delete saveData._id;
        
        let result = await updateDocToCollection(db, 'historyInfo', {
          uid: uid,
        }, saveData);
        if (result && result.code !== 200) {
          return result;
        }
        return { code: 200, msg: '更新应用信息成功', data: saveData}
      }
    }else{
      return { code: 500, msg: '数据库异常', data: data};
    }

    return { code: 500, msg: '数据库异常', data: data};
  }


  //录入
     
      //----------取得最新的全局appIndex
      let global = await db.collection('globalInfo').where({ _id: 'indexs' }).get()
      if (global && global.errMsg != 'collection.get:ok') {
        return { code: 500, msg: '读取globalInfo异常', data: global };
      }

      let globalData = global.data[0]
      let currHisUid = 0; //应用的自定义id
      let updata = {}
      currHisUid = num10ToNumX(1000 + globalData.hisIndex + 1);//当前第X个应用；
      updata = { hisIndex: db.command.inc(1) }

      global=await db.collection('globalInfo').where({ _id: 'indexs' }).update({
        data: updata
      })
      if (global && global.errMsg != 'collection.update:ok') {
        return { code: 500, msg: '更新globalInfo-hisIndex异常', data: global };
      }
      //----------end

      //开始保存

      //saveData需要补充写入信息 createTime: createUserId: 
      let createTime = new Date().getTime();
      saveData = Object.assign(saveData, {
        uid: currHisUid
      })

      //写入
      await addDocToCollection(db, 'historyInfo', saveData);
      //写入修改日志
      // saveData.stampTime = createTime;
      // await addDocToCollection(db, 'updateAppInfoLog', saveData);
      return { code: 200, msg: '录入成功', data: saveData}
}