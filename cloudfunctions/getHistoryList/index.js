//取得历史数据 指定日期的
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  const db = cloud.database({
    env: wxContext.ENV
  });

  let pageIndex=event['pageIndex']||0;//第几页
  let stampTime=event['stampTime']||0;//当前日期时间
  let numMax=event['numMax']||5;
  let day=event['day'];//查询这一天的历史事件

  //数量
  const _=db.command;
  let resultCount = await db.collection('historyInfo')
  .where({
    day:day,
    stampTime:_.lt(stampTime)
  })
  .count();

  //今天的总数量
  let total=resultCount.total;
 
  let result = await db.collection('historyInfo')
  .where({
    day:day,
    stampTime:_.lt(stampTime)
  })
  .orderBy('stampTime','desc')
  .skip(pageIndex*numMax)
  .limit(numMax)
  .get();

  if (!result ||result.errMsg !== 'collection.get:ok') {
    return { code: 500, msg: '数据异常', data: result };
  }
  let list=result.data;
  return { code: 200, msg: '成功取得历史数据', data: {list:list,total:total }};
}