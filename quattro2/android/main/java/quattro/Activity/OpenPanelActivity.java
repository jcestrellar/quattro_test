package quattro.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.ListView;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONException;

import quattro.app.R;

public class OpenPanelActivity extends AppCompatActivity {

	private JSONArray extensions = null;

	private List<File>   fileList = null;
	private List<String> nameList = null;
	private List<String> history = null;

	private ArrayAdapter<String> adapter = null;
	private TextView title = null;
	private ListView listView = null;
	private Button cancelBtn = null;
	private ImageView backBtn = null;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		EdgeToEdge.enable(this);
		setContentView(R.layout.open_panel);
		ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
			Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
			v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
			return insets;
		});

		Intent intent = getIntent();
		String filter = intent.getStringExtra("filter");
		if (filter != null) {
			try {
				extensions = new JSONArray(filter);
			} catch (JSONException e) {}
		}

		createHistory(intent);

		title = (TextView)findViewById(R.id.textView1);

		backBtn = (ImageView)findViewById(R.id.imageView2);
		backBtn.setOnClickListener(new OnClickListener() {
			@Override
			public void onClick(View v) {
				onKeyDown(KeyEvent.KEYCODE_BACK, null);
			}
		});

		cancelBtn = (Button)findViewById(R.id.button1);
		cancelBtn.setOnClickListener(new OnClickListener() {
			@Override
			public void onClick(View v) {
				setResult(RESULT_CANCELED, new Intent());
				finish();
			}
		});
		
		listView = (ListView)findViewById(R.id.listView1);
		listView.setOnItemClickListener(new AdapterView.OnItemClickListener() {
			@Override
			public void onItemClick(AdapterView<?> parent, View view, int position,long id) {
				File file = fileList.get(position);
				if (file.isDirectory()) {
					history.add(file.getAbsolutePath() + "/");
					list();
				} else {
					Intent data = new Intent();
					Bundle bundle = new Bundle();
					bundle.putString("file", file.getAbsolutePath());
					data.putExtras(bundle);
					setResult(RESULT_OK, data);
					finish();
				}
			}
		});

		list();
	}

	private void createHistory(Intent intent) {
		File filesDir = this.getExternalFilesDir(null);
		if (filesDir == null) { filesDir = this.getFilesDir(); }
		String homeDir = filesDir.getAbsolutePath();
		history = new ArrayList<String>();
		history.add(homeDir + "/");

		String initDir = intent.getStringExtra("initDir");
		if ((initDir != null) && !initDir.isEmpty()) {
			File file = new File(initDir);
			if (file.exists() && file.isDirectory()) {
				String path = file.getAbsolutePath();
				if (path.startsWith(homeDir)) {
					String[] paths = path.substring(homeDir.length()).split("\\/");
					path = (homeDir + "/");
					for (int i = 0; i < paths.length; i++) {
						if (paths[i].isEmpty()) continue;
						history.add(path += (paths[i] + "/"));
					}
				}
			}
		}
	}

	@Override
	public boolean onKeyDown(int keyCode, KeyEvent event) {
		if (keyCode == KeyEvent.KEYCODE_BACK) {
			if (history.size() > 1) {
				int index = history.size() - 1;
				history.remove(index);
				list();
			}
			return true;
		}
		return false;
	}

	private void list() {
		fileList = new ArrayList<File>();
		nameList = new ArrayList<String>();

		String path = history.get(history.size() - 1);

		title.setText(path.substring(history.get(0).length() - 1));
		
		File[] files = new File(path).listFiles();
		if (files != null) {
			List<File> ls = Arrays.asList(files);
			Collections.sort(ls, new Comparator<File>() {
				public int compare(File a, File b) {
					if ( a.isDirectory() && !b.isDirectory()) { return  1; }
					if (!a.isDirectory() &&  b.isDirectory()) { return -1; }
					return a.getName().compareTo(b.getName());
				}
			});

			for (File file : ls) {
				if (file.isDirectory()) {
					fileList.add(file);
					nameList.add(file.getName() + "/");
				} else if ((extensions != null) && (extensions.length() > 0)) {
					String ext = getExtension(file.getName());
					for (int i = 0; i < extensions.length(); i++) {
						try {
							if (ext.equalsIgnoreCase(extensions.getString(i))) {
								fileList.add(file);
								nameList.add(file.getName());
								break;
							}
						} catch (JSONException e) {}
					}
				} else {
					fileList.add(file);
					nameList.add(file.getName());
				}
			}
		}

		adapter = new ArrayAdapter<String>(this,
				android.R.layout.simple_list_item_1,
				nameList.toArray(new String[0]));
		listView.setAdapter(adapter);

		backBtn.setVisibility((history.size() > 1) ? View.VISIBLE : View.INVISIBLE);
	}

	private static String getExtension(String name) {
		int index = name.lastIndexOf(".");
		return (index > 0) ? name.substring(index + 1) : "";
	}

}
