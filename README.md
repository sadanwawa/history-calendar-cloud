# 云开发 历史日历 （history-calendar）

这里是history-calendar项目的云开发工程，主要包括云函数源代码；

## 云函数说明
1.loginCloud取得用户基本信息
2.getHistoryList取得历史数据
3.saveHistoryInfo录入|修改历史数据

## 工程配置  
更新project.config.json文件中的appid字段为自己小程序appid


## 云端资源准备

1.创建集合：
globalInfo： 配置全局数据  
导入dbData/globalInfo.json数据

historyInfo： 历史事件数据 
导入dbData/historyInfo.json数据

userInfo：  用户数据
visitLog：  用户访问记录


## 云函数上传并部署