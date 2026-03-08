import type Phaser from 'phaser';

/**
 * AudioManager — thin wrapper for Phaser sound with volume control.
 * Plays SFX and music by key from the Phaser audio cache.
 */
export class AudioManager {
	private scene: Phaser.Scene;
	private music: Phaser.Sound.BaseSound | null = null;
	private musicKey: string | null = null;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	/** Play a one-shot SFX if the key is loaded */
	playSfx(key: string, volume = 0.5): void {
		if (this.scene.cache.audio.exists(key)) {
			this.scene.sound.play(key, { volume });
		}
	}

	/** Start looping background music (stops current track if different) */
	playMusic(key: string, volume = 0.3): void {
		if (this.musicKey === key && this.music?.isPlaying) return;

		this.stopMusic();

		if (!this.scene.cache.audio.exists(key)) return;

		this.music = this.scene.sound.add(key, { loop: true, volume });
		this.music.play();
		this.musicKey = key;
	}

	/** Stop current music */
	stopMusic(): void {
		if (this.music) {
			this.music.stop();
			this.music.destroy();
			this.music = null;
			this.musicKey = null;
		}
	}

	/** Clean up on scene shutdown */
	destroy(): void {
		this.stopMusic();
	}
}
