package quattro.Activity;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputType;
import android.view.KeyEvent;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
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

import quattro.app.R;

public class SavePanelActivity extends AppCompatActivity {

	private boolean chooseFolder = false;
	private String filename = null;
	private String extension = null;

	private List<File>   fileList = null;
	private List<String> nameList = null;
	private List<String> history = null;

	private ArrayAdapter<String> adapter = null;
	private TextView title = null;
	private ListView listView = null;
	private Button cancelBtn = null;
	private Button saveBtn = null;
	private Button folderBtn = null;
	private ImageView backBtn = null;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		EdgeToEdge.enable(this);
		setContentView(R.layout.save_panel);
		ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
			Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
			v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
			return insets;
		});

		Intent intent = getIntent();
		chooseFolder = intent.getBooleanExtra("chooseFolder", false);
		filename = intent.getStringExtra("filename");
		extension = intent.getStringExtra("extension");
		if (filename == null) {
			filename = "Untitled";
		}

		createHistory(intent);

		title = (TextView)findViewById(R.id.textView1);

		backBtn = (ImageView)findViewById(R.id.imageView2);
		backBtn.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				onKeyDown(KeyEvent.KEYCODE_BACK, null);
			}
		});

		cancelBtn = (Button)findViewById(R.id.button1);
		cancelBtn.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				setResult(RESULT_CANCELED, new Intent());
				finish();
			}
		});
		
		saveBtn = (Button)findViewById(R.id.button2);
		saveBtn.setText(chooseFolder ? R.string.ok : R.string.save);
		saveBtn.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				save();
			}
		});

		folderBtn = (Button)findViewById(R.id.button3);
		folderBtn.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				folder();
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
		int index = filename.lastIndexOf("/");
		if (index >= 0) {
			initDir = filename.substring(0, index);
			filename = filename.substring(index + 1);
		}
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

	private void save() {
		if (chooseFolder) {
			File file = new File(history.get(history.size() - 1));
			Intent data = new Intent();
			Bundle bundle = new Bundle();
			bundle.putString("path", file.getAbsolutePath() + "/");
			data.putExtras(bundle);
			setResult(RESULT_OK, data);
			finish();
			return;
		}

		final EditText editView = new EditText(SavePanelActivity.this);
		editView.setText(filename);
		editView.setInputType(InputType.TYPE_CLASS_TEXT);
		new AlertDialog.Builder(SavePanelActivity.this)
			.setIcon(android.R.drawable.ic_dialog_info)
			.setTitle(R.string.enter_file_name)
			.setView(editView)
			.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
				@Override
				public void onClick(DialogInterface dialog, int whichButton) {
					filename = editView.getText().toString().replace("/", ":");
					if (filename.length() > 0) {
						String path = history.get(history.size() - 1) + filename;
						if (extension != null) {
							String ext = getExtension(filename);
							if (!ext.equalsIgnoreCase(extension)) {
								path += "." +  extension;
							}
						}
						File file = new File(path);
						if (file.exists()) {
							exists(file);
						} else {
							Intent data = new Intent();
							Bundle bundle = new Bundle();
							bundle.putString("file", file.getAbsolutePath());
							data.putExtras(bundle);
							setResult(RESULT_OK, data);
							finish();
						}
					}
				}
						})
			.setNegativeButton(R.string.cancel, new DialogInterface.OnClickListener() {
				@Override
				public void onClick(DialogInterface dialog, int whichButton) {}
			}).show();
	}

	private void exists(final File file) {
		if (file.isDirectory()) {
			new AlertDialog.Builder(SavePanelActivity.this)
				.setIcon(android.R.drawable.ic_dialog_alert)
				.setTitle(R.string.exists_same_folder)
				.setPositiveButton(R.string.close, new DialogInterface.OnClickListener() {
					@Override
					public void onClick(DialogInterface dialog, int whichButton) {}
				}).show();
		} else {
			new AlertDialog.Builder(SavePanelActivity.this)
				.setIcon(android.R.drawable.ic_dialog_alert)
				.setTitle(R.string.overwrite)
				.setPositiveButton(R.string.yes, new DialogInterface.OnClickListener() {
					@Override
					public void onClick(DialogInterface dialog, int whichButton) {
						Intent data = new Intent();
						Bundle bundle = new Bundle();
						bundle.putString("file", file.getAbsolutePath());
						data.putExtras(bundle);
						setResult(RESULT_OK, data);
						finish();
					}
				})
				.setNegativeButton(R.string.no, new DialogInterface.OnClickListener() {
					@Override
					public void onClick(DialogInterface dialog, int whichButton) {}
				}).show();
		}
	}
	
	private void folder() {
		final EditText editView = new EditText(SavePanelActivity.this);
		editView.setInputType(InputType.TYPE_CLASS_TEXT);
		new AlertDialog.Builder(SavePanelActivity.this)
			.setIcon(android.R.drawable.ic_dialog_info)
			.setTitle(R.string.enter_folder_name)
			.setView(editView)
			.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
				@Override
				public void onClick(DialogInterface dialog, int whichButton) {
					String name = editView.getText().toString().replace("/", ":");
					if (name.length() > 0) {
						String path = history.get(history.size() - 1) + name;
						(new File(path)).mkdir();
						list();
					}
				}
			})
			.setNegativeButton(R.string.cancel, new DialogInterface.OnClickListener() {
				@Override
				public void onClick(DialogInterface dialog, int whichButton) {}
			}).show();
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
				} else if ((extension != null) && (extension.length() > 0)) {
					String ext = getExtension(file.getName());
					if (ext.equalsIgnoreCase(extension)) {
						fileList.add(file);
						nameList.add(file.getName());
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
