import type * as Phaser from 'phaser';

export interface AudioVolumes {
	master: number;
	sfx: number;
	music: number;
}

/**
 * AudioManager — thin wrapper for Phaser sound with volume control.
 * Plays SFX and music by key from the Phaser audio cache.
 * Volume levels: effective = category * master.
 */
export class AudioManager {
	private scene: Phaser.Scene;
	private music: Phaser.Sound.BaseSound | null = null;
	private musicKey: string | null = null;
	private masterVol: number;
	private sfxVol: number;
	private musicVol: number;
	private baseMusicVol = 0.3;

	constructor(scene: Phaser.Scene, volumes?: Partial<AudioVolumes>) {
		this.scene = scene;
		this.masterVol = volumes?.master ?? 0.8;
		this.sfxVol = volumes?.sfx ?? 1.0;
		this.musicVol = volumes?.music ?? 0.7;
	}

	/** Play a one-shot SFX if the key is loaded */
	playSfx(key: string, volume = 0.5): void {
		if (this.scene.cache.audio.exists(key)) {
			this.scene.sound.play(key, { volume: volume * this.sfxVol * this.masterVol });
		}
	}

	/** Start looping background music (stops current track if different) */
	playMusic(key: string, volume = 0.3): void {
		if (this.musicKey === key && this.music?.isPlaying) return;

		this.stopMusic();

		if (!this.scene.cache.audio.exists(key)) return;

		this.baseMusicVol = volume;
		const effectiveVol = volume * this.musicVol * this.masterVol;
		this.music = this.scene.sound.add(key, { loop: true, volume: effectiveVol });
		this.music.play();
		this.musicKey = key;
	}

	/** Update volume levels at runtime (e.g. from settings change) */
	setVolumes(volumes: Partial<AudioVolumes>): void {
		if (volumes.master !== undefined) this.masterVol = volumes.master;
		if (volumes.sfx !== undefined) this.sfxVol = volumes.sfx;
		if (volumes.music !== undefined) this.musicVol = volumes.music;

		// Apply to currently playing music
		if (this.music?.isPlaying) {
			const webAudio = this.music as Phaser.Sound.WebAudioSound;
			if (typeof webAudio.setVolume === 'function') {
				webAudio.setVolume(this.baseMusicVol * this.musicVol * this.masterVol);
			}
		}
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
