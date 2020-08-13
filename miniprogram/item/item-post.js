import {getDiffTime, randomString} from '../utils/util.js'
import { comments } from '../data/data.js';

class itPost{
  constructor(){
    this.storageKeyName = 'comments';
  }

  //实现点赞功能，点赞或者取消。更新缓存数据，返回最新的缓存数据
  upUpdate(idx, openId){
    var res = this.getCommentStorage();
    if(res[idx].upInfo.upStatus){
      // 取消点赞
      res[idx].upInfo.upNum--;
      const index = res[idx].upInfo.upUserList.indexOf(openId)
      if(index>-1){
      res[idx].upInfo.upUserList.splice(index, 1)
      console.log("取消点赞成功")
    }else{
      console.log(`取消点赞失败 index is ${index} openId is ${openId} upList is ${res[idx].upInfo.upUserList}`)
    }
    }
    else{
      res[idx].upInfo.upNum++;
      res[idx].upInfo.upUserList.unshift(openId)
    }
    res[idx].upInfo.upStatus = !res[idx].upInfo.upStatus;
    
    wx.setStorageSync(this.storageKeyName, res);
    return res
  }

  // 对于时间先后的排序，最新的在前
  compareDate(data){
    //冒泡排序法两两比较
    var t = null;
    for(let idx_i=0;idx_i<data.length;idx_i++){
      for(let idx_j=0;idx_j<data.length-idx_i-1;idx_j++){
        if(data[idx_j].create_time<data[idx_j+1].create_time){
          t = data[idx_j];
          data[idx_j] = data[idx_j+1]
          data[idx_j+1] = t;
        }
      }
    }
    return data
  }

  //缓存添加评论
  updateCommentStorage(data, idx, key){
    //保存用户的点赞列表，不是很优雅的获取了AppID
    if(!this.openId){
      this.openId = wx.getStorageSync('userOpenId')
    }
    // data.upUserList.unshift(this.openId)

    key = key||this.storageKeyName;
    // console.log("key name is"+key);
    // 保存在当地数据
    var res = this.getCommentStorage(key);
    // 在置顶后添加数据
    res.splice(1,0,data);
    wx.setStorageSync(key, res);
    this.updateBase(idx, [data]);
    //console.log("update comments is "+ [data])
    return res
  }
  getCommentStorage(key){
    // use syny method
    // use this.data.data to update storage
    // 从本地缓存中获取信息
    key = key||this.storageKeyName;
    // 若没有，则调用云数据库进行数据的读取
    return wx.getStorageSync(key)
  }

  // 从数据库读取信息
  // 要不要添加环境参数？
  commentFromCloud(idx, cWindow){
    // 因为cm是then和catch是异步编程，因此在这里去获得缓存是不正确的
    var that = this;
    try{
      const comment_data = wx.cloud.callFunction({
          name:"getComment",
          data:{
            idx:idx
          },
          success: function(res){
            console.log("Successfully Load database data from comments-"+idx);
            // console.log("comments data is "+res.result.data)
            var data = that.compareDate(res.result.data);
            for(let idx=0;idx<data.length;idx++){
              data[idx].formatedDate = getDiffTime(data[idx].create_time, true);
            }
            wx.setStorageSync(that.storageKeyName, data)
          },
          fail: function(res){
            const initData = [{
              _id:randomString(),
              description:"Oringinal Response",
              avatar:'/images/userAvatar.jpg',
              artIdx:idx,
              content:{
                audio:null,
                img:[],
                txt:"告诉我你在想什么，想告诉我们什么吧."
              },
              upInfo:{
                upUserList:[],
                upNum:0,
                upStatus:false,
              },
              create_time:1628555309, //时间对应于2021年，在未来进行更新
              username:'饼子屋',
            }]
            console.log("initially set storage")
            wx.setStorageSync(that.storageKeyName, initData)
            wx.cloud.callFunction({
            name:"initComment",
            data:{
              idx:idx,
              initData:initData
            },
            success: function(res){
              console.log("Successfully init database comments-"+idx);
            },
            fail:console.error
          })
         },
         //实现用户未登录时的数据加载：实现防止保存缓存早于创建新的数据库集合，第119行
          complete: function(res){
            wx.getSetting({
              success(res){
                if(!res.authSetting['scope.userInfo']){
                console.log("unlogin setData")
                var comments = wx.getStorageSync('comments');
                cWindow.setData({
                  comments:comments
                })
              }
              }
            })
          },
      })
    }catch(e){
      console.log("itPost commentFromCloud failed");
      throw e;
    }
  }

  // 更新数据库信息
  updateBase(idx, data, key){
    key = key||this.storageKeyName;
    //console.log("data is "+ data)
    const new_data = data || wx.getStorageSync(key)
    wx.cloud.callFunction({
      name:"updateComment",
      data:{
        newdata:new_data,
        idx:idx
      },
    }).then(res=>{
      console.log("Database updated successfully.")
    }).catch(e=>{
      console.error;
      throw e;
    })
  }

  // 更新点赞
  updateUp(idx, data, key){
    key = this.storageKeyName||key
    const comments = data||wx.getStorageSync(key)
    wx.cloud.callFunction({
      name:"updateUp",
      data:{
        comments:comments,
        idx:idx
      }
    }).then(res=>{
      console.log("Up num updated successfully")
    }).catch(e=>{
      throw e;
    })
  }

  // 云更新集合(点赞以及信息) 
  /*
  async updateCloud(idx, key){
    await this.updateBase(idx, key);
    await this.updateUp(idx, key);
  }*/
}

export{itPost}