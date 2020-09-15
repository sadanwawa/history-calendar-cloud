//记录用户基本信息
const cloud = require('wx-server-sdk')

const AuthLevel={
  MANAGER:1,
  VIP:2,
  NORMAL:3,
  BAD:4
}

//进制转换；
//10进制 转为X进制
function num10ToNumX(num) {
  let chars = 'qpmbtwfxjaohdyrvkeusiznlgc'
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
  return target;
}

//X进制 转为10进制
function numXTNum10(str) {
  let chars = 'qpmbtwfxjaohdyrvkeusiznlgc'
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

// 初始化 cloud
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

//在集合中更新记录数据
async function updateDocToCollection(db, colle, indexData, targetData) {
  let result=null;
  try {
    await db.collection(colle).where(indexData).update({
      data: targetData
    }).then(res => {
        result={code:200,msg:'更新数据成功',data:null};
    }).catch(res => {
        result={code:500,msg:'服务异常1',data:null};
    })
  } catch (e) {
    result={code:500,msg:'服务异常2',data:null};
  }
  return result;
}

//在集合中增加新的数据记录
async function addDocToCollection(db, colle, docData) {
  let result=null;
  try {
    await db.collection(colle).add({
      // data 字段表示需新增的 JSON 数据
      data: docData
    }).then(res => {
      result={code:200,msg:'添加数据成功',data:null};
    }).catch(res => {
      result={code:500,msg:'服务异常1',data:null};
    })
  } catch (e) {
    result={code:500,msg:'服务异常2',data:null};
  }
  return result;
}


//取得某时刻在某天的开始时间
function getTodayStartTime(stampTime) {

  let todayStart=0
  if(new Date(stampTime).getHours()>=16){ //16-24
    todayStart = new Date(new Date(stampTime).toLocaleDateString()).getTime() + 16 * 60 * 60 * 1000;
  }else{
    todayStart = new Date(new Date(stampTime).toLocaleDateString()).getTime()-8* 60 * 60 * 1000;
  }
  return todayStart; //1589472000000;
}

//取得今天结束的时间
function getTodayEndTime(stampTime) {

  let todayEnd = getTodayStartTime(stampTime) + 24 * 60 * 60 * 1000 - 1;
  return todayEnd;
}

function checkIsSameDay(lastTime,oldTime){
    
    if(lastTime>getTodayStartTime(oldTime)&&lastTime<getTodayEndTime(oldTime)){//同一天
      return true;
    }
    return false;
}

//判断两个时间间隔超过1天：按照北京时间计算
function checkDayContinue(oldT, newT) {

  let day1= getTodayEndTime(oldT);//时间1一天的开始时间
  let day2= getTodayEndTime(newT);//时间2一天的开始时间

  if (day2 - day1<36*60*60*1000) {
    return true; //连续的
  }
  return false //不连续
}

//保存用户数据
async function saveUserInfo(db, userInfo, fromUser) {

  try {
    let targetInfo = null;//用户当前的数据信息
    // 查找user数据库中是否有当前用户信息
    let data = await db.collection('userInfo').where({ openid: userInfo.openid }).get();
    if (data.errMsg === 'collection.get:ok') {
      if (data.data.length === 0) { //新用户

        //---------全局用户编号
        let global = await db.collection('globalInfo').where({ _id: 'indexs' }).get()
        if (global && global.errMsg != 'collection.get:ok') {
          return { code: 500, msg: '读取globalInfo异常', data: global };
        }

        let globalData = global.data[0]
        let currUid = ''; //应用的自定义id
        let updata = {}
        currUid = num10ToNumX(1000 + globalData.userIndex + 1);//当前第X个用户；
        updata = { userIndex: db.command.inc(1) }
        console.log('-uid:'+currUid);
        global = await db.collection('globalInfo').where({ _id: 'indexs' }).update({
          data: updata
        })
        if (global && global.errMsg != 'collection.update:ok') {
          return { code: 500, msg: '更新globalInfo-index异常', data: global };
        }
        //--------end

        let joinT = new Date().getTime()
        let visitDays = 1

        targetInfo = Object.assign(userInfo, {
          uid: currUid,//自定义的用户id
          joinT: joinT,//加入时间
          lastVisit: joinT,//最新访问时间
          visitDays: visitDays,//连续访问天数
          fromUser: fromUser,
          authLevel: AuthLevel.NORMAL,//用户权限：1管理员用户 2vip用户  3普通用户  4异常用户
          codeFileId:''//推广码
        });

        //不存在 加入
        await addDocToCollection(db, 'userInfo', targetInfo);

        //全局配置
        let globalInfo = {
          notice:globalData.notice
        }
        return { code: 200, msg: '取得用户数据', data: targetInfo, globalInfo: globalInfo };

      } else if (data.data.length >= 1) {//已经存在数据
        let info = {};

        //joinT 加入时间
        //lastVisit 上一次访问时间；
        //visitDays 连访问天数

        let joinT = 0
        let lastVisit = 0
        let visitDays = 0
        if (data.data[0].joinT) {
          joinT = data.data[0].joinT;
        } else {
          joinT = new Date().getTime();
        }

        if (data.data[0].lastVisit) {
          lastVisit = new Date().getTime();
          if (data.data[0].visitDays) {
            visitDays = data.data[0].visitDays;
          }

          //如果是在同一天
          if (checkIsSameDay(lastVisit,data.data[0].lastVisit)) {

          } else if (checkDayContinue(data.data[0].lastVisit, lastVisit)) {
            //新的一天
            visitDays = visitDays + 1;
          } else {//不连续 重置为1
            visitDays = 1
          }

        } else {
          visitDays = 1
          lastVisit = new Date().getTime();
        }

        if (userInfo._id) {delete userInfo._id;}
        if(userInfo.fromUser){delete userInfo.fromUser};
      
        //这里把前端传过来的userInfo直接塞入数据库中，会有一些安全风险！！！！！要做字段检查；
        info = Object.assign(userInfo, { 
          joinT: joinT, 
          lastVisit: lastVisit,
          visitDays: visitDays
        })

        await updateDocToCollection(db, 'userInfo', { openid: userInfo.openid }, info)

        targetInfo = Object.assign(data.data[0], info);

        //取得全局配置数据
        let global = await db.collection('globalInfo').where({ _id: 'indexs' }).get()
        if (global && global.errMsg != 'collection.get:ok') {
          return { code: 500, msg: '读取globalInfo异常', data: global };
        }
        let globalData = global.data[0]

        //全局配置
        let globalInfo = {
          notice:globalData.notice
        }
        return { code: 200, msg: '取得用户数据', data: targetInfo, globalInfo: globalInfo };
      }
    } else {//未取到数据
      return { code: 300, msg: '读取用户数据异常', data: userInfo };
    }
  } catch (e) {
    return { code: 300, msg: '读取用户数据异常', data: userInfo };
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  const db = cloud.database({
    env: wxContext.ENV
  });

  if (!event.info) {
    event.info = {};
  }
  event.info = Object.assign(event.info, {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  })

  //判断是否通过扫个人二维码回流
  let fromUser = ''
  if (event['from']) {
    let params = event['from'].split('-');
    if (params.length > 1) {
      fromUser = params[1];
    }
  }

  let uscene = event['uscene'];

  console.log('info:'+JSON.stringify(event.info));
  //录入信息访问记录visitLog: 
  let result = await saveUserInfo(db, event.info, fromUser);
  console.log('result:'+JSON.stringify(result));

  if (uscene) {
    let logInfo = {
      scene:uscene,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      userId:result.data.uid,
      stampTime: new Date().getTime()
    }
    await addDocToCollection(db, 'visitLog', logInfo);
  }

  if (result && result.code === 200) {
    return { code: 200, msg: '返回用户信息', data: { userInfo: result.data, globalInfo: result.globalInfo } }
  } else {
    return { code: 300, msg: '读取用户信息异常', data: result.data }
  }

}
