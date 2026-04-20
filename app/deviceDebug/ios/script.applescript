-- Safariが起動しているか確認
tell application "System Events"
    set safariRunning to (exists (process "Safari"))
end tell

-- Safariをアクティブ化
tell application "Safari"
    activate
end tell

-- もし、Safariを完全に終了した状態から起動する場合、起動に時間がかかるため手動で遅延
if not safariRunning then
    delay 2 -- 2秒待機
end if

on menu_click(mList)
    local appName, topMenu, r
    
    -- 入力の検証
    if mList's length < 3 then error "メニューリストが十分長くありません"
    
    -- これらの変数を後で明確にするために設定
    set {appName, topMenu} to (items 1 through 2 of mList)
    set r to (items 3 through (mList's length) of mList)
    
    -- この長すぎる行は、menu_recurse 関数を2つの引数で呼び出します：
    -- rと、トップレベルメニューへの参照
    tell application "System Events" to my menu_click_recurse(r, ((process appName)'s (menu bar 1)'s (menu bar item topMenu)'s (menu topMenu)))
end menu_click

on menu_click_recurse(mList, parentObject)
    local f, r
    
    -- `f` = 最初の項目、`r` = 残りの項目
    set f to item 1 of mList
    if mList's length > 1 then set r to (items 2 through (mList's length) of mList)
    
    -- メニューアイテムを実際にクリックするか、再帰する
    tell application "System Events"
        if mList's length is 1 then
            click parentObject's menu item f
        else
            my menu_click_recurse(r, (parentObject's (menu item f)'s (menu f)))
        end if
    end tell
end menu_click_recurse

-- 文字列の前後の空白や改行を削除する関数
on trim(theText)
    -- AppleScriptのtext item delimitersを使って空白や改行を除去
    set savedDelimiters to AppleScript's text item delimiters
    set AppleScript's text item delimiters to {space, tab, return, linefeed}
    set textItems to text items of theText
    set AppleScript's text item delimiters to ""
    set trimmedText to textItems as string
    set AppleScript's text item delimiters to savedDelimiters
    return trimmedText
end trim

-- メニュー項目を取得して"Develop"または"開発"のどちらかを取得する処理
set developMenuName to missing value

tell application "System Events"
    tell process "Safari"
        set menuBarList to name of every menu bar item of menu bar 1
        repeat with menuName in menuBarList
            set trimmedMenuName to my trim(menuName)
            if trimmedMenuName contains "Develop" or menuName contains "開発" then
                set developMenuName to menuName
                exit repeat
            end if
        end repeat
    end tell
end tell

if developMenuName is missing value then
    error "Safariの「開発」または「Develop」メニューが見つかりません。"
end if

-- Safariを完全に立ち上げてからメニューを取得
global simulatorValue

tell application "System Events"
    tell process "Safari"
        -- 「開発」メニュー内の項目を取得
        set menuItemList to name of every menu item of menu developMenuName of menu bar item developMenuName of menu bar 1
        repeat with menuItem in menuItemList
            if (menuItem contains "iPhone") or (menuItem contains "iPad") then
                set simulatorValue to menuItem
            end if
        end repeat
    end tell
end tell

log simulatorValue

-- シミュレーター内のWebViewエントリーを検索
set targetMenuItem to missing value

tell application "System Events"
    tell process "Safari"

        set developMenu to menu developMenuName of menu bar item developMenuName of menu bar 1
        set simulatorMenuItem to menu item simulatorValue of developMenu
        set simulatorMenu to menu simulatorValue of simulatorMenuItem

        repeat with mi in every menu item of simulatorMenu
            if (name of mi is "Starter Kit") and (enabled of mi is true) then
                set targetMenuItem to mi
                exit repeat
            end if
        end repeat

    end tell
end tell

if targetMenuItem is not missing value then
    tell application "System Events" to click targetMenuItem
else
    error "有効な Starter Kit が見つかりません"
end if
