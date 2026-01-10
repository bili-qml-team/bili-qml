/**
  interface SpinQueryConfig {
  ** 最大重试次数 *
  maxRetry?: number
  ** 重试间隔(ms) *
  queryInterval?: number
}
*/
const defaultConfig = {
  maxRetry: 15,
  queryInterval: 1000,
}
/**
 * @template T
 * @param {() => T} query
 * @param {(target: T, stop: () => void) => boolean} [condition]
 * @param {Object} [config]
 * @returns {Promise<T|null>}
 */
const sq = (
  query,
  condition = it => Boolean(it),
  config = defaultConfig,
) => {
  const combinedConfig = {
    ...defaultConfig,
    ...config,
  }

  return new Promise(resolve => {
    let target = null
    let queryTimes = 0

    const stop = () => {
      resolve(target)
    }

    const tryQuery = () => {
      if (queryTimes > combinedConfig.maxRetry) {
        resolve(null)
        return
      }

      target = query()

      if (condition(target, stop) === true) {
        resolve(target)
      } else {
        setTimeout(() => {
          if (typeof document === 'undefined') {
            tryQuery()
            return
          }

          waitForForeground(() => {
            queryTimes++
            tryQuery()
          })
        }, combinedConfig.queryInterval)
      }
    }

    tryQuery()
  })
}
/**
 * 等待标签页处于前台时(未失去焦点, 未最小化)再执行动作
 * @param action 要执行的动作
 */
export const waitForForeground = (action) => {
  const runAction = () => {
    if (document.visibilityState === 'visible') {
      action()
      document.removeEventListener('visibilitychange', runAction)
      return true
    }
    return false
  }
  const isNowForeground = runAction()
  if (isNowForeground) {
    return
  }
  document.addEventListener('visibilitychange', runAction)
}
/** 等待播放器准备好, 如果过早注入 DOM 元素可能会导致爆炸
 *
 * https://github.com/the1812/Bilibili-Evolved/issues/1076
 * https://github.com/the1812/Bilibili-Evolved/issues/770
 */
const playerReady = async () => {
  await sq(
    () => unsafeWindow,
    () => unsafeWindow.UserStatus !== undefined,
  )
    ////  return new Promise<void>((resolve, reject) => {
  return new Promise((resolve, reject) => {
    const isJudgementVideo =
      document.URL.replace(window.location.search, '') ===
        'https://www.bilibili.com/blackboard/newplayer.html' && document.URL.includes('fjw=true')
    if (isJudgementVideo) {
      /* 如果是风纪委员里的内嵌视频, 永远不 resolve
        https://github.com/the1812/Bilibili-Evolved/issues/2340
      */
      return
    }
    if (isEmbeddedPlayer()) {
      return
    }
    if (unsafeWindow.onLoginInfoLoaded) {
      unsafeWindow.onLoginInfoLoaded(resolve)
    } else {
      console.error(`typeof onLoginInfoLoaded === ${typeof unsafeWindow.onLoginInfoLoaded}`)
      reject()
    }
  })
}

//// type Executable<ReturnType = void> = () => ReturnType | Promise<ReturnType>

/**
 * 向视频操作按钮区的 "收藏" 右侧添加元素
 * @param getButton 存在按钮区时, 将调用此函数获取要添加的元素
 * @returns 添加成功时返回添加后的元素, 不成功时返回 null
 */
//// const addVideoActionButton = async (getButton: Executable<Element>) => {
const addVideoActionButton = async (getButton) => {
  await playerReady()
  const favoriteButton = dq(
    '.video-toolbar .ops .collect, .video-toolbar-v1 .toolbar-left .collect, .video-toolbar-left-item.video-fav',
////  ) as HTMLElement
    )
  if (!favoriteButton) {
    return null
  }
////  const { hasVideo } = await import('@/core/spin-query')
  await hasVideo()
  const button = await getButton()
  if (favoriteButton.classList.contains('video-fav')) {
    favoriteButton.parentElement.insertAdjacentElement('afterend', button)
  } else {
    favoriteButton.insertAdjacentElement('afterend', button)
  }
  return button
}
/**
 * 等待视频加载, 可获取到 `cid` 时结束, 返回 `boolean` 值代表是否存在视频
 */
const hasVideo = async () => {
  if (!hasVideoPromiseCache) {
    hasVideoPromiseCache = new Promise(resolve => videoChange(() => resolve(unsafeWindow.cid)))
  }
  const cid = await hasVideoPromiseCache
  return Boolean(cid)
}
/** 
const mountVueComponent = (module, target) => {
  const obj = 'default' in module ? module.default : module

  const getInstance = (o) => {
    if (o instanceof Function) {
      // eslint-disable-next-line new-cap
      return new o()
    }
    if (o.functional) {
      return new (Vue.extend(o))()
    }
    return new Vue(o)
  }

  return getInstance(obj).$mount(target)
}
*/