package org.reptile;

import org.animals.Dog;

public class AnimalMarilho {

	public AnimalMarilho() {
		super();
	}
	
	protected int speed;
	protected String action;

	public int getSpeed() {
		return speed;
	}

	public void setSpeed(int speed) {
		this.speed = speed;
	}

	public String getAction() {
		return action;
	}

	public void setAction(String action) {
		this.action = action;
		int speed = getSpeed();
		Reptile reptile = new Reptile();
		System.out.println(reptile.getName() + reptile.hashCode());
		Dog dog = new Dog();
		dog.takeABreath();
	}

}
