tell application "Google Chrome"
    activate

    -- すべてのウィンドウをチェック
    set devToolsClosed to false
    repeat with currentWindow in windows
        -- ウィンドウに含まれているタブを確認
        if (count of tabs of currentWindow) > 0 then
            repeat with currentTab in tabs of currentWindow
                -- タブが DevTools ウィンドウであるかをチェック
                if title of currentTab contains "DevTools" then
                    -- DevTools ウィンドウが見つかった場合、そのウィンドウを閉じる
                    close currentWindow
                    set devToolsClosed to true
                    exit repeat
                end if
            end repeat
        end if
        if devToolsClosed then exit repeat
    end repeat

    -- chrome://inspect/#devices を開く前に既に開いているタブを確認
    set inspectTabFound to false
    repeat with aTab in tabs of window 1
        if URL of aTab contains "chrome://inspect" then
            set inspectTabFound to true
            exit repeat
        end if
    end repeat

    -- "chrome://inspect/#devices" タブが見つからなければ新しく開く
    if not inspectTabFound then
        open location "chrome://inspect/#devices"
    end if

    -- T.B.D
    -- inspect を実行する
    -- -- chrome://inspect/#devices の画面で、inspect が表示されるまで時間がかかるので待つ
    -- delay 3

    -- tell front window
    --     tell active tab
    --         execute javascript "Array.from(document.querySelectorAll('.action')).find(e => e.textContent.trim() === 'inspect').click();"
    --     end tell
    -- end tell
end tell